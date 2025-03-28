"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { ConnectKitButton } from "connectkit";
import axios from "axios";
import { Weth_abi } from "./Weth_abi";
import { mainnet, arbitrum } from "viem/chains";
import { Loader2, ChevronDown, ExternalLink } from "lucide-react";

const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const arbitrumWeth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

const FeeProgressBar = ({ label, value, total, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-300">{value.toFixed(6)} ETH</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div 
        className={`${color} h-2 rounded-full transition-all duration-500`} 
        style={{ width: `${(value / total) * 100}%` }}
      />
    </div>
  </div>
);

export default function ConvertEthToWeth() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [ethAmount, setEthAmount] = useState("");
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [fetchingFees, setFetchingFees] = useState(false);
  const [error, setError] = useState("");
  const [showFeeDetails, setShowFeeDetails] = useState(false);

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const handleWrapETH = async () => {
    if (!address) return alert("Please connect your wallet first");
    if (!ethAmount || isNaN(Number(ethAmount))) return alert("Please enter a valid ETH amount");
    if (Number(ethAmount) <= 0) return alert("Amount must be greater than 0");

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
    if (!ethAmount || isNaN(Number(ethAmount))) return alert("Please enter a valid ETH amount");
    if (Number(ethAmount) <= 0) return alert("Amount must be greater than 0");

    setFetchingFees(true);
    setError("");
    setFeeData(null);

    try {
      const url = `https://app.across.to/api/suggested-fees?inputToken=${wethAddress}&outputToken=${arbitrumWeth}&originChainId=${mainnet.id}&destinationChainId=${arbitrum.id}&amount=${BigInt(parseFloat(ethAmount) * 1e18)}`;
      const response = await axios.get(url);
      if (!response.data) throw new Error("No fee data received");
      setFeeData(response.data);
    } catch (error) {
      console.error("Error fetching suggested fees:", error.message);
      setError(error.message);
    } finally {
      setFetchingFees(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-start p-6 pt-12">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6 border border-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 pointer-events-none" />
        
        <div className="text-center space-y-2 relative z-10">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            ETH ⇄ WETH Converter
          </h1>
          <p className="text-gray-400">Seamlessly convert and bridge assets</p>
        </div>

        <div className="flex justify-center relative z-10">
          <ConnectKitButton.Custom>
            {({ isConnected, show }) => (
              <button
                onClick={show}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                  isConnected 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg hover:shadow-indigo-500/20"
                }`}
              >
                {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect Wallet"}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>

        {address && (
          <div className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">ETH Amount</label>
              <div className="relative group">
                <input
                  type="number"
                  placeholder="0.0"
                  className="w-full p-3.5 bg-gray-900 border-2 border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-gray-100 placeholder-gray-600 transition-all"
                  value={ethAmount}
                  onChange={(e) => {
                    setEthAmount(e.target.value);
                    setError("");
                  }}
                />
                <span className="absolute right-3 top-3.5 text-gray-500">ETH</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWrapETH}
                disabled={loading || !ethAmount}
                className={`flex items-center justify-center p-3.5 rounded-xl font-medium transition-all ${
                  loading || !ethAmount
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg hover:shadow-indigo-500/20"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-200" />
                    Wrapping...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔄</span>
                    Convert
                  </>
                )}
              </button>

              <button
                onClick={getSuggestedFees}
                disabled={fetchingFees || !ethAmount}
                className={`flex items-center justify-center p-3.5 rounded-xl font-medium transition-all ${
                  fetchingFees || !ethAmount
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-500 shadow-lg hover:shadow-purple-500/20"
                }`}
              >
                {fetchingFees ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-purple-200" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🌉</span>
                    Bridge Fees
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 text-red-400 rounded-xl border border-red-800/50">
                ⚠️ {error}
              </div>
            )}

            {txHash && (
              <div className="p-3 bg-indigo-900/30 rounded-xl border border-indigo-800/50 flex items-center justify-between">
                <span className="text-indigo-400 text-sm">Transaction submitted</span>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center"
                >
                  View <ExternalLink className="ml-1.5 h-4 w-4" />
                </a>
              </div>
            )}

            {receipt && (
              <div className="p-3 bg-green-900/30 text-green-400 rounded-xl border border-green-800/50">
                ✅ Transaction confirmed!
              </div>
            )}

            {feeData && (() => {
              const totalFees = (feeData.capitalFeeTotal + feeData.relayFeeTotal + feeData.relayGasFeeTotal) / 1e18;
              const percentage = ((totalFees / parseFloat(ethAmount)) * 100).toFixed(2);
              
              return (
                <div className="border-2 border-gray-700 rounded-xl overflow-hidden bg-gray-900">
                  <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-medium text-gray-300">Bridge Cost Summary</h3>
                    <button
                      onClick={() => setShowFeeDetails(!showFeeDetails)}
                      className="text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                          showFeeDetails ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-800/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-indigo-400">Total Cost</span>
                        <span className="text-lg font-bold text-indigo-300">
                          {totalFees.toFixed(6)} ETH
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>💸</span>
                        <span>
                          {percentage}% of your transfer amount
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">You Send</span>
                        <span className="text-gray-300">{ethAmount} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">You Receive</span>
                        <span className="text-gray-300">
                          {(parseFloat(ethAmount) - totalFees).toFixed(6)} ETH
                        </span>
                      </div>
                    </div>

                    {showFeeDetails && (
                      <div className="pt-4 border-t border-gray-800 space-y-3">
                        <div className="flex flex-col gap-2">
                          <FeeProgressBar 
                            label="Network Fees"
                            value={feeData.relayGasFeeTotal / 1e18}
                            total={totalFees}
                            color="bg-purple-500"
                          />
                          <FeeProgressBar
                            label="Service Fees"
                            value={(feeData.capitalFeeTotal + feeData.relayFeeTotal) / 1e18}
                            total={totalFees}
                            color="bg-indigo-500"
                          />
                          <FeeProgressBar
                            label="Liquidity Fees"
                            value={feeData.lpFeeTotal ? feeData.lpFeeTotal / 1e18 : 0}
                            total={totalFees}
                            color="bg-pink-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="text-center pt-4 border-t border-gray-700/50">
              <p className="text-sm text-gray-600">
                Powered by <span className="text-indigo-400">Across</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}