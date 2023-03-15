import { Request, Response } from "express";
import { ValidationError, ValidationResult } from "../types/validation";
import { validationResult } from "express-validator";
import { CampaignStatus } from "../types/campaign/CampaignStatus";
import Campaign from "../models/CampaignSchema";
import Load from "../types/load";
import { LoadStatus } from "../types/load/LoadStatus";
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
            const campaigns = await Campaign.find({
                startDate: { $lte: now },
                endDate: { $gte: now },
                status: { $in: [CampaignStatus.READY, CampaignStatus.ACTIVE] },
            });
            console.log(campaigns, "these are the campaigns");

            if (campaigns.length === 0)
                return res.status(404).json({
                    status: "error",
                    message: "no campaigns to load",
                });

            let regionNames = new Intl.DisplayNames(["en"], { type: "region" });

            // removing campaigns that the (served loads + pending loads)*price > budget
            let filteredCampaigns = campaigns.filter((campaign) => {
                const servedCount = this.calculateLoadStatus(
                    LoadStatus.SERVED,
                    campaign.loads
                );

                const pendingCount = this.calculateLoadStatus(
                    LoadStatus.PENDING,
                    campaign.loads
                );

                const totalCost =
                    ((servedCount + pendingCount) / 1000) *
                    Number(process.env.THOUSAND_VIEWS_COST);

                return (
                    totalCost <= campaign.budget * 1.1 &&
                    campaign.country === regionNames.of(region)

                    //  &&
                    // !this.isViewedInPastDay(deviceId, campaign.loads)
                );
            });

            if (filteredCampaigns.length === 0)
                return res.status(404).json({
                    status: "error",
                    message: "no campaigns to load",
                });

            // calculate campaigns serve needs

            const campaignArray = filteredCampaigns.map((campaign: any) => {
                const servedCount = this.calculateLoadStatus(
                    LoadStatus.SERVED,
                    campaign.loads
                );

                const pendingCount = this.calculateLoadStatus(
                    LoadStatus.PENDING,
                    campaign.loads
                );

                let totalNeeds =
                    (campaign.budget /
                        Number(process.env.THOUSAND_VIEWS_COST)) *
                        1000 -
                    servedCount -
                    pendingCount;

                if (totalNeeds < 0) totalNeeds = 0;

                const endDate = new Date(campaign.endDate);

                // Calculate the remaining hours between now and the end date of the campaign
                const now = new Date();
                const diffInMs = endDate.getTime() - now.getTime(); // getTime() returns the timestamp in milliseconds
                const remainingHours = diffInMs / (1000 * 60 * 60);

                console.log(remainingHours); // Output: number of remaining hours between now and the end date of the campaign
                const campaignNeeds = totalNeeds / remainingHours;

                return {
                    campaign,
                    campaignNeeds,
                };
            });

            const selectedCampaign = this.pickRandomCampaign(campaignArray);

            selectedCampaign.loads.push(
                this.newLoadObject(deviceId, placementId)
            );
            await selectedCampaign.save();

            res.status(200).json({
                status: "success",
                data: {
                    title: selectedCampaign.title,
                    url: selectedCampaign.link,
                    img: selectedCampaign.photoPath,
                    userId: selectedCampaign.userId,
                    campaignId: selectedCampaign._id,
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

    private static newLoadObject = (
        deviceId: string,
        placementId: string
    ): Load => {
        return {
            deviceId,
            placementId,
            status: LoadStatus.PENDING,
            createdAt: new Date(Date.now()),
        };
    };

    private static calculateLoadStatus = (
        status: LoadStatus,
        loadArray: Array<Load>
    ): number => {
        let count = 0;

        loadArray.forEach((load: Load) => {
            if (load.status === status) count += 1;
        });

        return count;
    };

    private static isViewedInPastDay = (
        deviceId: string,
        loadArray: Array<Load>
    ): boolean => {
        // pending or served in the last 24 hours load with that deviceId

        const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        return loadArray.some((load) => {
            return (
                (load.deviceId === deviceId &&
                    load.status === LoadStatus.PENDING) ||
                (load.status === LoadStatus.SERVED &&
                    load.createdAt >= cutoffDate)
            );
        });
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
