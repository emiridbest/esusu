import { NextResponse } from "next/server";
import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT!,
    pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { feedbackData } = body;

        if (!feedbackData) {
            return NextResponse.json({ error: "Missing feedbackData" }, { status: 400 });
        }

        const content = JSON.stringify(feedbackData);
        const file = new File(
            [content],
            `feedback-${feedbackData.agentId}-${Date.now()}.json`,
            { type: "application/json" }
        );

        const upload = await pinata.upload.public.file(file);

        return NextResponse.json({ cid: upload.cid });
    } catch (error: any) {
        console.error("Pinata upload error:", error);
        return NextResponse.json(
            { error: error?.message || "Upload failed" },
            { status: 500 }
        );
    }
}
