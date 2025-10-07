import { useWallet, CardanoWallet } from "@meshsdk/react";
import { useState, useEffect } from "react";

interface WalletConnectionProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
  connected: boolean;
}

export default function WalletConnection({
  onConnect,
  onDisconnect,
  connected,
}: WalletConnectionProps) {
  const { connected: walletConnected, wallet } = useWallet();
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    if (walletConnected && wallet) {
      wallet.getUsedAddresses().then((addresses) => {
        if (addresses.length > 0) {
          const addr = addresses[0];
          setAddress(addr);
          onConnect(addr);
        }
      });
    } else {
      setAddress("");
      onDisconnect();
    }
  }, [walletConnected, wallet, onConnect, onDisconnect]);

  const formatAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="w-full [&>div]:w-full [&_button]:w-full">
      <CardanoWallet isDark={true} />
    </div>
  );
}
