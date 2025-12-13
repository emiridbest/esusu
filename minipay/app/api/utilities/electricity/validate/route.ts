import { NextRequest, NextResponse } from 'next/server';
import { electricityPaymentService } from '@esusu/backend/lib/services/electricityPaymentService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { country, providerId, customerId } = body;

        if (!country || !providerId || !customerId) {
            return NextResponse.json(
                { error: 'Missing required fields: country, providerId, customerId' },
                { status: 400 }
            );
        }

        console.log(`Validating customer for electricity payment:`, { country, providerId, customerId });

        const validationResult = await electricityPaymentService.validateCustomer({
            country: country.trim().toLowerCase(),
            providerId: providerId.toString(),
            customerId: customerId.trim()
        });

        return NextResponse.json({
            valid: validationResult.valid,
            customerName: validationResult.customerName,
            customerAddress: validationResult.customerAddress,
            tariff: validationResult.tariff,
            outstandingAmount: validationResult.outstandingAmount,
            error: validationResult.error
        });
    } catch (error: any) {
        console.error('Error validating electricity customer:', error);
        return NextResponse.json(
            { 
                valid: false,
                error: 'Validation service temporarily unavailable',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

