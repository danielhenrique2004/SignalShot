import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Verificar variáveis de ambiente
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY não configurada');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Variáveis do Supabase não configuradas');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Remover criação global do cliente Supabase

export async function POST(req: NextRequest) {
  try {
    // Verificar variáveis de ambiente
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Configuração da API OpenAI ausente. Configure OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Configuração do Supabase ausente. Configure as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    // Criar cliente Supabase para uso no servidor
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { image, userId } = await req.json();

    // Validações de entrada
    if (!image) {
      return NextResponse.json(
        { error: 'Imagem não fornecida' },
        { status: 400 }
      );
    }

    // Usar userId fornecido ou 'anonymous' como padrão
    const finalUserId = userId || 'anonymous';

    // Verificar se a imagem é uma string base64 válida
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Imagem inválida' },
        { status: 400 }
      );
    }

    // Analisar imagem com OpenAI Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise este gráfico de trading/opções binárias e forneça:\\\\n1. Ação recomendada (COMPRAR, VENDER ou AGUARDAR)\\\\n2. Nível de confiança (0-100%)\\\\n3. Raciocínio detalhado\\\\n4. Indicadores técnicos (tendência, suporte, resistência, volume)\\\\n\\\\nResponda APENAS em formato JSON válido:\\\\n{\\\\n  \\\"action\\\": \\\"COMPRAR\\\" | \\\"VENDER\\\" | \\\"AGUARDAR\\\",\\\\n  \\\"confidence\\\": number,\\\\n  \\\"reasoning\\\": \\\"string\\\",\\\\n  \\\"indicators\\\": {\\\\n    \\\"trend\\\": \\\"string\\\",\\\\n    \\\"support\\\": \\\"string\\\",\\\\n    \\\"resistance\\\": \\\"string\\\",\\\\n    \\\"volume\\\": \\\"string\\\"\\\\n  }\\\\n}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta vazia da API');
    }

    const analysis = JSON.parse(content);

    // Validar resposta da IA
    if (!analysis.action || !['COMPRAR', 'VENDER', 'AGUARDAR'].includes(analysis.action)) {
      throw new Error('Resposta inválida da IA');
    }

    if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
      throw new Error('Confiança inválida');
    }

    // Salvar análise no Supabase
    const { error: insertError } = await supabase
      .from('analyses')
      .insert({
        user_id: finalUserId,
        image_url: image.substring(0, 100), // Salvar apenas início da string base64
        action: analysis.action,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        indicators: analysis.indicators,
      });

    if (insertError) {
      console.error('Erro ao salvar análise:', insertError);
      // Não retornar erro, apenas logar
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Erro na análise:', error);

    // Mensagens de erro mais específicas
    let errorMessage = 'Erro ao analisar gráfico';
    let statusCode = 500;

    if (error.message?.includes('API key')) {
      errorMessage = 'Erro de autenticação com OpenAI. Verifique a configuração.';
    } else if (error.message?.includes('Resposta vazia')) {
      errorMessage = 'A análise não retornou resultados. Tente com outra imagem.';
    } else if (error.message?.includes('JSON')) {
      errorMessage = 'Erro ao processar resposta da análise. Tente novamente.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}