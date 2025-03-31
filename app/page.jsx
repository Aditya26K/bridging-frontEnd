"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { ConnectKitButton } from "connectkit";
import axios from "axios";
import { Weth_abi } from "./Weth_abi";
import { Deposite_abi } from "./Deposite_abi";
import { mainnet, arbitrum } from "viem/chains";
import { Loader2 } from "lucide-react";

const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const arbitrumWeth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const BridgeContract = "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5";

export default function ConvertEthToWeth() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [ethAmount, setEthAmount] = useState("");
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [fetchingFees, setFetchingFees] = useState(false);
  const [error, setError] = useState("");

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const handleWrapETH = async () => {
    if (!address) return alert("Please connect your wallet first");
    if (!ethAmount || isNaN(Number(ethAmount)) || Number(ethAmount) <= 0) 
      return alert("Please enter a valid ETH amount");

    try {
      setLoading(true);
      const txHash = await writeContractAsync({
        address: wethAddress,
        abi: Weth_abi,
        functionName: "deposit",
        value: parseEther(ethAmount),
        gasLimit: BigInt(3000000),
      });
      setTxHash(txHash);
    } catch (error) {
      console.error("Transaction failed:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedFees = async () => {
    if (!ethAmount || isNaN(Number(ethAmount)) || Number(ethAmount) <= 0) 
      return alert("Please enter a valid ETH amount");

    setFetchingFees(true);
    setError("");
    setFeeData(null);

    try {
      const url = `https://app.across.to/api/suggested-fees?inputToken=${wethAddress}&outputToken=${arbitrumWeth}&originChainId=${mainnet.id}&destinationChainId=${arbitrum.id}&amount=${BigInt(parseFloat(ethAmount) * 1e18)}`;
      const response = await axios.get(url);

      console.log("Suggested fees response:", response.data);

      if (!response.data) throw new Error("No fee data received");

      setFeeData({ 
        capitalFeeTotal: response.data.capitalFeeTotal, 
        relayFeeTotal: response.data.relayFeeTotal, 
        totalRelayFee: response.data.totalRelayFee.total 
      });

    } catch (error) {
      console.error("Error fetching suggested fees:", error.message);
      setError(error.message);
    } finally {
      setFetchingFees(false);
    }
  };

  const handleDepositForBridging = async () => {
    if (!address) return alert("Please connect your wallet first");
    if (!ethAmount || isNaN(Number(ethAmount)) || Number(ethAmount) <= 0) 
      return alert("Please enter a valid ETH amount");

    try {
      setLoading(true);

      console.log("Approving WETH...");
      const approveTxHash = await writeContractAsync({
        address: wethAddress,
        abi: Weth_abi,
        functionName: "approve",
        args: [BridgeContract, parseEther(ethAmount)],
        gasLimit: BigInt(300000),
      });

      console.log("Approval transaction sent:", approveTxHash);

      await new Promise(resolve => setTimeout(resolve, 5000)); // Delay for transaction finality

      console.log("Initiating deposit for bridging...");
      const bridgeTxHash = await writeContractAsync({
        address: BridgeContract,
        abi: Deposite_abi,
        functionName: "depositV3Now",
        args: [
          address,
          address,
          wethAddress,
          arbitrumWeth,
          parseEther(ethAmount),
          parseEther(ethAmount),
          arbitrum.id,
          "0x0000000000000000000000000000000000000000",
          600,
          0,
          "0x",
        ],
        gasLimit: BigInt(3000000),
      });

      console.log("Bridging transaction sent:", bridgeTxHash);
      setTxHash(bridgeTxHash);
    } catch (error) {
      console.error("Bridging deposit failed:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-gray-800 rounded-xl p-6 shadow-xl flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
        
        {/* Left Panel */}
        <div className="w-full lg:w-2/3 p-6 space-y-6">
          <h1 className="text-3xl font-bold text-white text-center">ETH ⇄ WETH & Bridging</h1>

          <div className="flex justify-center">
            <ConnectKitButton />
          </div>

          {address && (
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Enter ETH amount"
                className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-indigo-500"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
              />

              <button
                onClick={handleWrapETH}
                disabled={loading}
                className="w-full p-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Convert ETH to WETH"}
              </button>

              <button
                onClick={getSuggestedFees}
                disabled={fetchingFees}
                className="w-full p-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition flex items-center justify-center"
              >
                {fetchingFees ? <Loader2 className="animate-spin mr-2" /> : "Calculate Bridge Fees"}
              </button>

              <button
                onClick={handleDepositForBridging}
                disabled={!feeData}
                className="w-full p-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center"
              >
                🚀 Initiate Bridging
              </button>

              {txHash && (
                <p className="text-white">Transaction Hash: {txHash}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Fee Display */}
        <div className="w-full lg:w-1/3 p-6 bg-gray-700 rounded-xl">
          <h2 className="text-xl font-bold text-white text-center">Estimated Fees</h2>
          
          {feeData ? (
            <div className="mt-4 text-white space-y-2">
              <p className="flex justify-between">
                <span>Capital Fee:</span>
                <span>{(Number(feeData.capitalFeeTotal) / 1e18).toFixed(6)} WETH</span>
              </p>
              <p className="flex justify-between">
                <span>Relay Fee:</span>
                <span>{(Number(feeData.relayFeeTotal) / 1e18).toFixed(6)} WETH</span>
              </p>
              <p className="flex justify-between font-semibold">
                <span>Total Fee:</span>
                <span>{(Number(feeData.totalRelayFee) / 1e18).toFixed(6)} WETH</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-300 text-center mt-4">No fee data available</p>
          )}
        </div>
      </div>
    </div>
  );
}