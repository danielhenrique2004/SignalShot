"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Upload, TrendingUp, TrendingDown, Loader2, AlertCircle, History, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase, type Analysis } from "@/lib/supabase";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";

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
  const router = useRouter();
  const [user, setUser] = useState<any>({ id: 'anonymous', email: 'anonymous@example.com' });
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    // Carregar histórico para usuário anônimo
    loadHistory('anonymous');
  }, []);

  const loadHistory = async (userId: string) => {
    // Não carregar histórico se Supabase não estiver configurado
    if (!supabase) {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

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
      // Validar tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo 10MB.");
        return;
      }

      // Validar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        setError("Tipo de arquivo inválido. Use apenas imagens.");
        return;
      }

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
    if (!image || !user) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Construir URL da API (relativa funciona melhor no Next.js)
      const apiUrl = '/api/analyze-chart';
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          image, 
          userId: user.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro na análise (${response.status})`);
      }

      const data = await response.json();
      
      // Validar resposta
      if (!data.action || !data.confidence || !data.reasoning) {
        throw new Error("Resposta inválida da API");
      }

      setResult(data);

      // Toast de sucesso
      toast.success("Análise concluída com sucesso!", {
        description: `Recomendação: ${data.action} (${data.confidence}% de confiança)`,
        duration: 5000,
      });

      // Recarregar histórico
      await loadHistory(user.id);
    } catch (err: any) {
      console.error("Erro na análise:", err);
      const errorMessage = err.message || "Erro ao analisar gráfico. Tente novamente.";
      setError(errorMessage);
      toast.error("Erro na análise", {
        description: errorMessage,
      });
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
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Background Image with Next.js Image optimization */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&h=1080&fit=crop&q=80"
          alt="Background trading chart"
          fill
          className="object-cover"
          priority
          quality={85}
          unoptimized={false}
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-slate-800 text-white hover:bg-slate-700"
              aria-label={showHistory ? "Ocultar histórico" : "Mostrar histórico"}
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            SignalShot
          </h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg">
            Capture gráficos e receba sinais de trading em tempo real
          </p>
        </header>

        {/* Histórico */}
        {showHistory && (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-6">
            <CardHeader>
              <CardTitle className="text-white">Histórico de Análises</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingHistory ? (
                // Loading skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <AnalysisSkeleton key={i} />
                ))
              ) : history.length > 0 ? (
                history.map((item) => (
                  <article
                    key={item.id}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className={`font-bold ${
                            item.action === "COMPRAR"
                              ? "text-emerald-400"
                              : item.action === "VENDER"
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        >
                          {item.action}
                        </span>
                        <span className="text-slate-400 text-sm ml-2">
                          {item.confidence}% confiança
                        </span>
                      </div>
                      <time className="text-slate-500 text-xs" dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </time>
                    </div>
                    <p className="text-slate-300 text-sm mt-2">{item.reasoning}</p>
                  </article>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4">
                  Nenhuma análise encontrada. Faça sua primeira análise!
                </p>
              )}
            </CardContent>
          </Card>
        )}

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
                  aria-label="Visualização da câmera para capturar gráfico"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    aria-label="Capturar foto do gráfico"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Capturar
                  </Button>
                  <Button
                    onClick={stopCamera}
                    size="lg"
                    variant="outline"
                    className="border-slate-700 text-white hover:bg-slate-800"
                    aria-label="Cancelar captura e fechar câmera"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Image Preview - Usar img normal para base64 */}
            {image && !cameraActive && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border-2 border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt="Gráfico capturado para análise"
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={analyzeChart}
                    disabled={analyzing}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    size="lg"
                    aria-label="Analisar gráfico capturado"
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
                    aria-label="Reiniciar análise e remover imagem"
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
                  aria-label="Abrir câmera para capturar gráfico"
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
                  aria-label="Fazer upload de imagem de gráfico"
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
                  aria-label="Selecionar arquivo de imagem"
                />
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert className="bg-red-950/50 border-red-900 text-red-200" role="alert">
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
                  role="region"
                  aria-labelledby="analysis-result"
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
                          <h3 id="analysis-result" className="text-2xl sm:text-3xl font-bold text-white">
                            {result.action}
                          </h3>
                          <p className="text-slate-400 text-sm sm:text-base">
                            Confiança: {result.confidence}%
                          </p>
                        </div>
                      </div>
                      <CheckCircle className="w-8 h-8 text-emerald-400" aria-hidden="true" />
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
        <Alert className="mt-6 bg-amber-950/30 border-amber-900/50 text-amber-200" role="alert">
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
