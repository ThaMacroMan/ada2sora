import { useWallet, CardanoWallet } from "@meshsdk/react";
import { useEffect } from "react";

interface WalletConnectionProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
}

export default function WalletConnection({
  onConnect,
  onDisconnect,
}: WalletConnectionProps) {
  const { connected: walletConnected, wallet } = useWallet();

  useEffect(() => {
    if (walletConnected && wallet) {
      wallet.getUsedAddresses().then((addresses) => {
        if (addresses.length > 0) {
          const addr = addresses[0];
          onConnect(addr);
        }
      });
    } else {
      onDisconnect();
    }
  }, [walletConnected, wallet, onConnect, onDisconnect]);

  return (
    <div className="w-full [&>div]:w-full [&_button]:w-full">
      <CardanoWallet isDark={true} />
    </div>
  );
}
