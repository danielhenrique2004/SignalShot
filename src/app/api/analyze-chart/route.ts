import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Imagem não fornecida" },
        { status: 400 }
      );
    }

    // Análise do gráfico usando OpenAI Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise técnica de opções binárias. Analise o gráfico fornecido e retorne APENAS um JSON válido com a seguinte estrutura:
{
  "action": "COMPRAR" | "VENDER" | "AGUARDAR",
  "confidence": número entre 0-100,
  "reasoning": "explicação detalhada da análise em português",
  "indicators": {
    "trend": "descrição da tendência",
    "support": "nível de suporte identificado",
    "resistance": "nível de resistência identificado",
    "volume": "análise do volume"
  }
}

Analise:
- Padrões de candlestick (doji, martelo, engolfo, etc)
- Tendências (alta, baixa, lateral)
- Níveis de suporte e resistência
- Volume de negociação
- Indicadores técnicos visíveis (médias móveis, RSI, MACD, Bollinger Bands)
- Padrões gráficos (triângulos, bandeiras, cabeça e ombros)

Seja preciso e objetivo. A confiança deve refletir a clareza dos sinais.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise este gráfico de opções binárias e forneça uma recomendação de COMPRAR, VENDER ou AGUARDAR com base na análise técnica.",
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Extrair JSON da resposta
    let analysisResult;
    try {
      // Tentar parsear diretamente
      analysisResult = JSON.parse(content);
    } catch {
      // Se falhar, tentar extrair JSON de markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error("Não foi possível extrair JSON da resposta");
      }
    }

    // Validar estrutura da resposta
    if (!analysisResult.action || !analysisResult.confidence || !analysisResult.reasoning) {
      throw new Error("Resposta da IA incompleta");
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("Erro na análise:", error);
    return NextResponse.json(
      { 
        error: "Erro ao analisar gráfico",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}
