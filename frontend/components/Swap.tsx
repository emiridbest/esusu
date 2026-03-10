import { SwapWidget } from "thirdweb/react";
import { client } from "@/lib/thirdweb";

function Swap() {
    return <SwapWidget
        client={client}
        prefill={{
            sellToken: {
                chainId: 42220,
                tokenAddress: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
            },
            buyToken: {
                chainId: 42220,
                tokenAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
            },
        }}
        showThirdwebBranding={false}
    />;
}

export default Swap;