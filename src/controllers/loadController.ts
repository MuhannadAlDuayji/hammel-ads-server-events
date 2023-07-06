import { Request, Response } from "express";
import { ValidationError, ValidationResult } from "../types/validation";
import { validationResult } from "express-validator";
import { CampaignStatusId } from "../types/campaign/CampaignStatus";
import Campaign from "../models/CampaignSchema";
import loadSchema from "../models/LoadSchema";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";

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

            // filter campaigns with show period startDate >= now >= endDate

            const now = new Date();
            const campaigns: any[] = [];
            // const campaigns =  await Campaign.find({
            //     startDate: { $lte: now },
            //     endDate: { $gte: now },
            //     campaignStatusId: {
            //         $in: [CampaignStatusId.READY, CampaignStatusId.ACTIVE],
            //     },
            // }).select(
            //     "_id servedCount pendingCount budget country endDate link photoPath userId"
            // );

            if (campaigns.length === 0)
                return res.status(404).json({
                    status: "error",
                    message: "no campaigns to load",
                });

            let regionNames = new Intl.DisplayNames(["en"], { type: "region" });

            // removing campaigns that the (served loads + pending loads)*price > budget
            let filteredCampaigns = await Promise.all(
                campaigns.map(async (campaign) => {
                    // const servedCountPromise = loadSchema.countDocuments({
                    //     loadStatusId: LoadStatusId.SERVED,
                    // });

                    // const pendingCountPromise = loadSchema.countDocuments({
                    //     loadStatusId: LoadStatusId.PENDING,
                    // });
                    // const servedCountPromise = loadSchema.countDocuments({
                    //     loadStatusId: LoadStatusId.SERVED,
                    // });

                    // const pendingCountPromise = loadSchema.countDocuments({
                    //     loadStatusId: LoadStatusId.PENDING,
                    // });

                    const servedCount = campaign.servedCount;
                    const pendingCount = campaign.pendingCount;

                    const totalCost =
                        (servedCount / 1000) *
                        Number(process.env.THOUSAND_VIEWS_COST);

                    const cutoffDate = new Date(
                        Date.now() - 24 * 60 * 60 * 1000
                    );
                    // const viewedInPastDayPromise = await loadSchema.findOne({
                    //     deviceId: deviceId,
                    //     loadStatusId: {
                    //         $in: [
                    //             // LoadStatusId.PENDING,
                    //             LoadStatusId.SERVED,
                    //         ],
                    //     },
                    //     campaignId: campaign._id,
                    //     createdAt: { $gte: cutoffDate },
                    // });

                    if (
                        totalCost <= campaign.budget &&
                        (campaign.country.toLowerCase() ===
                            regionNames.of(region)?.toLowerCase() ||
                            campaign.country.toLowerCase() === "all countries")
                        // && !viewedInPastDayPromise
                    ) {
                        return { campaign, servedCount, pendingCount };
                    }

                    return null;
                })
            );

            return res
                .status(500)
                .json({ status: "error", message: "internal server error" });

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
                        campaignInfo.servedCount;

                    if (totalNeeds < 0) totalNeeds = 0;

                    const endDate = new Date(campaignInfo.campaign.endDate);

                    const now = new Date();
                    const diffInMs = endDate.getTime() - now.getTime();
                    const remainingMinutes = diffInMs / (1000 * 60);

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
            const selectedCampaign = this.pickRandomCampaign(campaignArray);

            selectedCampaign.pendingCount += 1;
            selectedCampaign.save();

            const newLoad = new loadSchema({
                campaignId: selectedCampaign._id,
                deviceId,
                placementId,
                loadStatusId: LoadStatusId.PENDING,
                loadStatusName: LoadStatusName.PENDING,
                country: regionNames.of(region),
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
