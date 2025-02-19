import * as _goat_sdk_core from '@goat-sdk/core';
import { z } from 'zod';

// Base Parameter Types
declare const DepositParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    tokenAddress: z.ZodString;
    amount: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tokenAddress: string;
    amount: string;
}, {
    tokenAddress: string;
    amount: string;
}>>;

declare const WithdrawParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    tokenAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tokenAddress: string;
}, {
    tokenAddress: string;
}>>;

declare const GetBalanceParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    account: z.ZodString;
    tokenAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    account: string;
    tokenAddress: string;
}, {
    account: string;
    tokenAddress: string;
}>>;

declare const SetUplinerParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    upliner: z.ZodString;
}, "strip", z.ZodTypeAny, {
    upliner: string;
}, {
    upliner: string;
}>>;

declare const BreakTimelockParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    tokenAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tokenAddress: string;
}, {
    tokenAddress: string;
}>>;

declare const GetDownlinersParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    upliner: z.ZodString;
}, "strip", z.ZodTypeAny, {
    upliner: string;
}, {
    upliner: string;
}>>;

declare const TimeSinceDepositParameters_base: _goat_sdk_core.ToolParametersStatic<z.ZodObject<{
    depositor: z.ZodString;
}, "strip", z.ZodTypeAny, {
    depositor: string;
}, {
    depositor: string;
}>>;

// Parameter Classes
declare class DepositParameters extends DepositParameters_base {}
declare class WithdrawParameters extends WithdrawParameters_base {}
declare class GetBalanceParameters extends GetBalanceParameters_base {}
declare class SetUplinerParameters extends SetUplinerParameters_base {}
declare class BreakTimelockParameters extends BreakTimelockParameters_base {}
declare class GetDownlinersParameters extends GetDownlinersParameters_base {}
declare class TimeSinceDepositParameters extends TimeSinceDepositParameters_base {}

// Token Constants
export const CELO_TOKEN_ADDRESS = "0x471EcE3750Da237f93B8E339c536989b8978a438";
export const CUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

// Exports
export {
    DepositParameters,
    DepositParameters as DepositCeloParameters,
    DepositParameters as DepositCusdParameters,
    WithdrawParameters,
    WithdrawParameters as WithdrawCeloParameters,
    WithdrawParameters as WithdrawCusdParameters,
    GetBalanceParameters,
    SetUplinerParameters,
    BreakTimelockParameters,
    GetDownlinersParameters,
    TimeSinceDepositParameters,
};