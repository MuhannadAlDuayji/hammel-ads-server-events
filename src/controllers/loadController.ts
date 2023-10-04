import { Request, Response } from "express";
import { ValidationError, ValidationResult } from "../types/validation";
import { validationResult } from "express-validator";
import { CampaignStatusId } from "../types/campaign/CampaignStatus";
import Campaign from "../models/CampaignSchema";
import loadSchema from "../models/LoadSchema";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";
import { IP2Location } from "ip2location-nodejs";
import requestIP from "request-ip";
let ip2location = new IP2Location();

ip2location.open(`${__dirname}/../static/IP2LOCATION-LITE-DB3.BIN`);
class LoadController {
    static load = async (req: Request, res: Response) => {
        try {
            const validationResults = validationResult(
                req
            ) as unknown as ValidationResult;
            const errors: ValidationError[] =
                (validationResults?.errors as ValidationError[]) || [];
            if (errors.length > 0) {
                return res.status(400).json({
                    status: "error",
                    message: `invalid ${errors[0]?.param} : ${errors[0]?.value}`,
                });
            }

            const { deviceId, placementId, region } = req.body;

            const clientIp = requestIP.getClientIp(req);

            let loadCity = "Unknown";
            let loadCountry = "Unknown";
            if (clientIp) {
                loadCity = ip2location.getCity(clientIp);
                loadCountry = ip2location.getCountryLong(clientIp);
            }
            // filter campaigns with show period startDate >= now >= endDate

            const now = new Date();
            let queryConditions: any = {
                startDate: { $lte: now },
                endDate: { $gte: now },
                campaignStatusId: {
                    $in: [CampaignStatusId.READY, CampaignStatusId.ACTIVE],
                },
            };
            const campaignWithDeviceIdAsTest = await Campaign.findOne({
                testDeviceId: deviceId,
            });
            if (campaignWithDeviceIdAsTest) {
                queryConditions.userId = campaignWithDeviceIdAsTest.userId;
                queryConditions.campaignStatusId = {
                    $in: [
                        CampaignStatusId.READY,
                        CampaignStatusId.ACTIVE,
                        CampaignStatusId.INREVIEW,
                    ],
                };
            }

            const campaigns = await Campaign.find(queryConditions);

            if (campaigns.length === 0)
                return res.status(404).json({
                    status: "error",
                    message: "no campaigns to load",
                });

            // if there is a campaign where testDeviceId === deviceId load one of the user campaigns which are valid

            if (campaignWithDeviceIdAsTest) {
                const randomIndex = Math.floor(
                    Math.random() * campaigns.length
                );
                const selectedCampaign = campaigns[randomIndex];
                const newLoad = new loadSchema({
                    campaignId: selectedCampaign._id,
                    deviceId,
                    placementId,
                    loadStatusId: LoadStatusId.PENDING,
                    loadStatusName: LoadStatusName.PENDING,
                    country: loadCountry,
                    city: loadCity,
                    createdAt: new Date(Date.now()),
                    isTest: true,
                });
                await newLoad.save();

                res.status(200).json({
                    status: "success",
                    data: {
                        loadId: newLoad._id,
                        url: selectedCampaign.link,
                        img: selectedCampaign.photoPath,
                        userId: selectedCampaign.userId,
                        campaignId: selectedCampaign._id,
                        country: newLoad.country,
                        city: newLoad.city,
                        createdAt: newLoad.createdAt,
                    },
                });
                return campaigns[randomIndex];
            }

            // removing campaigns that the (served loads + pending loads)*price > budget

            let filteredCampaigns = await Promise.all(
                campaigns.map(async (campaign) => {
                    const servedCount = campaign.servedCount;
                    const pendingCount = campaign.pendingCount;

                    const totalCost =
                        (servedCount / 1000) *
                        Number(process.env.THOUSAND_VIEWS_COST);

                    const cutoffDate = new Date(
                        Date.now() - 24 * 60 * 60 * 1000
                    );
                    const viewedInPastDay = await loadSchema.findOne({
                        deviceId: deviceId,
                        loadStatusId: LoadStatusId.SERVED,
                        campaignId: campaign._id,
                        createdAt: { $gte: cutoffDate },
                    });

                    const budgetExceeded = totalCost > campaign.budget;

                    const countryUnmatch =
                        campaign.country.toLowerCase() !== "all countries" &&
                        campaign.country.toLowerCase() !==
                            loadCountry.toLowerCase();
                    const cityUnmatch =
                        !campaign.targetedCities.includes(loadCity) &&
                        !campaign.targetedCities.includes("*") &&
                        campaign.country.toLowerCase() !== "all countries";

                    if (
                        !viewedInPastDay &&
                        !budgetExceeded &&
                        !countryUnmatch &&
                        !cityUnmatch
                    ) {
                        return { campaign, servedCount, pendingCount };
                    }

                    return null;
                })
            );

            filteredCampaigns = filteredCampaigns.filter(
                (campaign) => campaign !== null
            );

            if (filteredCampaigns.length === 0)
                return res.status(404).json({
                    status: "error",
                    message: "no campaigns to load",
                });

            // calculate campaigns serve needs

            const campaignArray = await Promise.all(
                filteredCampaigns.map(async (campaignInfo: any) => {
                    let totalNeeds =
                        (campaignInfo.campaign.budget /
                            Number(process.env.THOUSAND_VIEWS_COST)) *
                            1000 -
                        (campaignInfo.servedCount + campaignInfo.pendingCount);

                    // budget = 30
                    // THOUSAND_VIEWS_COST = 1$
                    // 30000

                    if (totalNeeds < 0) totalNeeds = 0;

                    const endDate = new Date(campaignInfo.campaign.endDate);

                    const now = new Date();
                    const diffInMs = endDate.getTime() - now.getTime();
                    const remainingMinutes = diffInMs / (1000 * 60);
                    // (x * 1000)* 60
                    const campaignNeeds = totalNeeds / remainingMinutes;

                    if (campaignNeeds > 1) {
                        return {
                            campaign: campaignInfo.campaign,
                            campaignNeeds,
                        };
                    }

                    return null;
                })
            );
            const array = campaignArray.filter((campaign) => campaign !== null);

            if (array.length === 0)
                return res.status(404).json({
                    status: "error",
                    message: "no campaigns to load",
                });
            const selectedCampaign = this.pickRandomCampaign(array);

            selectedCampaign.pendingCount += 1;
            await selectedCampaign.save();

            const newLoad = new loadSchema({
                campaignId: selectedCampaign._id,
                deviceId,
                placementId,
                loadStatusId: LoadStatusId.PENDING,
                loadStatusName: LoadStatusName.PENDING,
                country: loadCountry,
                city: loadCity,
                createdAt: new Date(Date.now()),
            });
            await newLoad.save();

            res.status(200).json({
                status: "success",
                data: {
                    loadId: newLoad._id,
                    url: selectedCampaign.link,
                    img: selectedCampaign.photoPath,
                    userId: selectedCampaign.userId,
                    campaignId: selectedCampaign._id,
                    country: newLoad.country,
                    createdAt: newLoad.createdAt,
                },
            });
        } catch (err: any) {
            console.log(err);
            res.status(500).json({
                status: "error",
                message: "internal server error",
            });
        }
    };

    private static pickRandomCampaign = (array: any) => {
        // Calculate the sum of the numbers in the array
        const sum = array.reduce(
            (acc: number, num: any) => acc + num.campaignNeeds,
            0
        );

        // Generate a random number between 0 and the sum
        const random = Math.random() * sum;

        // Iterate over the array, subtracting each from the random number until the result is negative
        let acc = 0;
        for (const campaign of array) {
            acc += campaign.campaignNeeds;
            if (random < acc) {
                return campaign.campaign;
            }
        }

        // If no number was selected, return the last one
        return array[array.length - 1].campaign;
    };
}

export default LoadController;
