"use client";

import { useState, useRef } from "react";
import { Camera, Upload, TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AnalysisResult = {
  action: "COMPRAR" | "VENDER" | "AGUARDAR";
  confidence: number;
  reasoning: string;
  indicators: {
    trend: string;
    support: string;
    resistance: string;
    volume: string;
  };
};

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError("Erro ao acessar câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeChart = async () => {
    if (!image) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) throw new Error("Erro na análise");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Erro ao analisar gráfico. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setImage(null);
    setResult(null);
    setError(null);
    stopCamera();
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-6 md:p-8 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&h=1080&fit=crop&q=80')"
      }}
    >
      {/* Overlay escuro para melhorar legibilidade */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            SignalShot
          </h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg">
            Capture gráficos e receba sinais de trading em tempo real
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-xl sm:text-2xl">
              Capturar Gráfico
            </CardTitle>
            <CardDescription className="text-slate-400">
              Use a câmera ou faça upload de uma imagem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera View */}
            {cameraActive && (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Capturar
                  </Button>
                  <Button
                    onClick={stopCamera}
                    size="lg"
                    variant="outline"
                    className="border-slate-700 text-white hover:bg-slate-800"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {image && !cameraActive && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border-2 border-slate-700">
                  <img
                    src={image}
                    alt="Gráfico capturado"
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={analyzeChart}
                    disabled={analyzing}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    size="lg"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Analisar Gráfico
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetAnalysis}
                    variant="outline"
                    size="lg"
                    className="border-slate-700 text-white hover:bg-slate-800"
                  >
                    Nova Análise
                  </Button>
                </div>
              </div>
            )}

            {/* Upload/Camera Buttons */}
            {!image && !cameraActive && (
              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Button
                  onClick={startCamera}
                  size="lg"
                  className="bg-gradient-to-r from-blue-900 to-blue-950 hover:from-blue-800 hover:to-blue-900 text-white h-24 sm:h-32"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8" />
                    <span className="text-base sm:text-lg font-semibold">Usar Câmera</span>
                  </div>
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                  className="bg-slate-800 text-white hover:bg-slate-700 h-16"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm sm:text-base font-semibold">Upload Imagem</span>
                  </div>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert className="bg-red-950/50 border-red-900 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Analysis Result */}
            {result && (
              <div className="space-y-4 animate-in fade-in duration-500">
                {/* Action Card */}
                <Card
                  className={`border-2 ${
                    result.action === "COMPRAR"
                      ? "bg-emerald-950/50 border-emerald-600"
                      : result.action === "VENDER"
                      ? "bg-red-950/50 border-red-600"
                      : "bg-amber-950/50 border-amber-600"
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {result.action === "COMPRAR" ? (
                          <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                        ) : result.action === "VENDER" ? (
                          <TrendingDown className="w-10 h-10 sm:w-12 sm:h-12 text-red-400" />
                        ) : (
                          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400" />
                        )}
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-white">
                            {result.action}
                          </h3>
                          <p className="text-slate-400 text-sm sm:text-base">
                            Confiança: {result.confidence}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                      {result.reasoning}
                    </p>
                  </CardContent>
                </Card>

                {/* Indicators */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg sm:text-xl">
                      Indicadores Técnicos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs sm:text-sm">Tendência</p>
                      <p className="text-white font-semibold text-sm sm:text-base">
                        {result.indicators.trend}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs sm:text-sm">Suporte</p>
                      <p className="text-white font-semibold text-sm sm:text-base">
                        {result.indicators.support}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs sm:text-sm">Resistência</p>
                      <p className="text-white font-semibold text-sm sm:text-base">
                        {result.indicators.resistance}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs sm:text-sm">Volume</p>
                      <p className="text-white font-semibold text-sm sm:text-base">
                        {result.indicators.volume}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Alert className="mt-6 bg-amber-950/30 border-amber-900/50 text-amber-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Aviso:</strong> Esta análise é apenas informativa e não constitui
            recomendação de investimento. Opções binárias envolvem alto risco.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
