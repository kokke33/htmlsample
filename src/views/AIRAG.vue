<template>
  <div class="ai-answer">
    <div class="chat-container">
      <div class="messages-area">
        <div v-for="(m, k) in messages" :key="k">
          <div v-if="m.role === 'user'" class="user-message preserve-whitespace">{{ m.content }}</div>
          <div v-else class="assistant-message preserve-whitespace">{{ m.content }}</div>
        </div>
        <div v-if="streamText !== ''" class="assistant-message preserve-whitespace">{{ streamText }}</div>
      </div>

      <div class="input-area">
        <textarea
        v-model="userInput"
        @keydown.ctrl.enter.prevent="submit"
        placeholder="解決したい問題を入力してください..."
        rows="3"
      ></textarea>
        <button type="button" @click="submit">送信</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { GraphAI, agentInfoWrapper } from 'graphai'
import * as vanilla_agents from '@graphai/vanilla'
// openai_fetch_agent はデフォルトエクスポートではないため、名前付きインポートに変更するか、そのまま使用
import * as openai_fetch_agent from '@graphai/openai_fetch_agent'
import { streamAgentFilterGenerator } from '@graphai/agent_filters'
// useStore はもしVuexを使っている場合に必要ですが、現状コード内では未使用です
// import { useStore } from 'vuex';
// service_agents から fetchAgent と wikipediaAgent をインポート
import { fetchAgent, wikipediaAgent } from '@graphai/service_agents'
import { tokenBoundStringsAgent } from '@graphai/token_bound_string_agent'

// Vuexストアを使わない場合はこの行は不要
// const store = useStore();

const openApiKey = import.meta.env.VITE_OPEN_API_KEY;
  const graph_data = {
    version: 0.5,
    loop: {
      while: ":continue",
    },
    nodes: {
      continue: {
        value: true,
        update: ":checkInput",
      },
      messages: {
        value: [{
          role: "system",
          content: ` ベテランのプロジェクトマネージャとして、
            ユーザの入力に関するアイデアを5個考えてください。
            理由は改行して２文字空けてから記載してください。
            英語で考えて、結果はすべて日本語で表示すること。
            【重要】回答に対しマークダウン形式は絶対に使用しないでください。
            回答する際は「アイデアは以下の通りです」といった文章からお願いします。
          `,
        }],
        update: ":reducer.array",
        // console: { after:true},
      },

      source: {
        value: {
          name: "Sam Bankman-Fried",
          topic: "sentence by the court",
          query: "describe the final sentence by the court for Sam Bank-Fried",
        },
      },
      wikipedia: {
        // Fetch an article from Wikipedia
        console: {
          before: "...fetching data from wikkpedia",
        },
        agent: "wikipediaAgent",
        inputs: { query: ":source.name" },
        params: {
          lang: "en",
        },
      },
      chunks: {
        // Break that article into chunks
        console: {
          before: "...splitting the article into chunks",
        },
        agent: "stringSplitterAgent",
        inputs: { text: ":wikipedia.content" },
      },
      chunkEmbeddings: {
        // Get embedding vectors of those chunks
        console: {
          before: "...fetching embeddings for chunks",
        },
        agent: "stringEmbeddingsAgent",
        inputs: { array: ":chunks.contents" },
      },
      topicEmbedding: {
        // Get embedding vector of the topic
        console: {
          before: "...fetching embedding for the topic",
        },
        agent: "stringEmbeddingsAgent",
        inputs: { item: ":source.topic" },
      },
      similarities: {
        // Get the cosine similarities of those vectors
        agent: "dotProductAgent",
        inputs: { matrix: ":chunkEmbeddings", vector: ":topicEmbedding.$0" },
      },
      sortedChunks: {
        // Sort chunks based on those similarities
        agent: "sortByValuesAgent",
        inputs: { array: ":chunks.contents", values: ":similarities" },
      },
      referenceText: {
        // Generate reference text from those chunks (token limited)
        agent: "tokenBoundStringsAgent",
        inputs: { chunks: ":sortedChunks" },
        params: {
          limit: 5000,
        },
      },
      prompt: {
        // Generate a prompt with that reference text
        agent: "stringTemplateAgent",
        inputs: { prompt: ":source.query", text: ":referenceText.content" },
        params: {
          template: "Using the following document, ${text}\n\n${prompt}",
        },
      },
      RagQuery: {
        // Get the answer from LLM with that prompt
        console: {
          before: "...performing the RAG query",
        },
        agent: "openAIAgent",
        inputs: { prompt: ":prompt" },
      },
      OneShotQuery: {
        // Get the answer from LLM without the reference text
        agent: "openAIAgent",
        inputs: { prompt: ":source.query" },
      },
      RagResult: {
        agent: "copyAgent",
        inputs: { result: ":RagQuery.text" },
        isResult: true,
      },
      OneShotResult: {
        agent: "copyAgent",
        inputs: { result: ":OneShotQuery.text" },
        isResult: true,
      },
      // 最後の出力
      reducer: {
        agent: "pushAgent",
        inputs: { array: ":appender3.array",
                 items: [{ content: ":nextQA_LLM.text", role: "assistant" }] },
        // console: { after:true},
      },
    },
  }

const userInput = ref("")
const inputPromise = ref([])
const submit = () => {
  if (inputPromise.value.length > 0) {
    const task = inputPromise.value.shift()
    if (task) {
      task(userInput.value)
      userInput.value = ""
    }
  }
}

const textPromise = () => {
  return new Promise((resolved) => {
    const task = (message) => {
      resolved(message)
    }
    inputPromise.value.push(task)
  })
}

// ユーザー入力を受け付けるカスタムエージェント関数
const textInputAgent = async (__context) => {
  const result = await textPromise()
  console.log(result)
  return {
    text: result,
    message: { role: "user", content: result },
  }
}

const streamText = ref("")
const outSideFunciton = (context, data) => {
  streamText.value = streamText.value + data
}
const agentFilters = [{
  name: "streamAgentFilter",
  agent: streamAgentFilterGenerator(outSideFunciton),
}]

const messages = ref([
  {
    role: 'assistant',
    content: `
このツールは、あなたの課題に対して5つのアイデアを提案し、それらを詳しく分析・評価します。

■ 使い方
1. 解決したい課題や問題を入力してください
2. AIが5つのアイデアを提案します
3. それぞれのアイデアを評価し、トップ3を選定します
4. 実施に向けた具体的な質問をご提案します

■ ヒント
・具体的な課題や問題を明確に伝えましょう
・目的や制約条件があれば併せて記載してください
・期待する成果やゴールも含めると、より適切な提案が得られます

それでは、課題や問題について教えてください。`
  }
])

const scrollToBottom = () => {
  setTimeout(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);
}

const runGraphAI = async () => {
  // GraphAIインスタンス生成時にエージェントを正しく登録
  const graph = new GraphAI(
    graph_data,
    {
      ...vanilla_agents, // vanilla_agentsはエクスポートされたオブジェクト全体を展開
      ...openai_fetch_agent, // openai_fetch_agentも同様
      wikipediaAgent, // インポートしたwikipediaAgentをキー名で登録 (ショートハンド)
      tokenBoundStringsAgent, // インポートしたtokenBoundStringsAgentをキー名で登録 (ショートハンド)
      fetchAgent,     // インポートしたfetchAgentをキー名で登録 (ショートハンド)
      textInputAgent: agentInfoWrapper(textInputAgent), // カスタムエージェント
    },
    { agentFilters }, // オプション
  )

  // ログコールバックの設定 (変更なし)
  graph.onLogCallback = async ({ nodeId, state, result }) => {
    if (state === "completed" && result) {
      // LLMを含むノードの完了時
      if (nodeId.includes("LLM")) {
        streamText.value = "" // ストリーミング表示をクリア
        // result.message が存在し、content があることを確認
        if (result.message && result.message.content) {
            const newMessages = [...messages.value, result.message];
            messages.value = newMessages; // messages ref を直接更新
            scrollToBottom();
        } else {
            // 予期せぬresult.messageの場合のログ出力（デバッグ用）
            console.warn(`LLM node ${nodeId} completed but result.message is missing or invalid:`, result);
        }
      }
      // ユーザー入力ノードの完了時
      if (nodeId === "userInput") {
        // result.message が存在することを確認
        if (result.message) {
            const newMessages = [...messages.value, result.message];
            messages.value = newMessages; // messages ref を直接更新
            scrollToBottom();
        } else {
             console.warn(`userInput node completed but result.message is missing:`, result);
        }
      }
    }
  }

  // GraphAIの実行 (変更なし)
  await graph.run()
}

// アプリケーション初期化時にGraphAIを実行 (変更なし)
runGraphAI()

</script>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.input-area {
  display: flex;
  gap: 10px;
  margin-top: 20px; /* 上部マージンを追加してメッセージエリアとのスペースを確保 */
}

.input-area textarea {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  font-size: inherit;
}

.input-area button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.input-area button:hover {
  background-color: #45a049;
}

.messages-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px; /* 下部マージンを調整 */
}

.preserve-whitespace {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.user-message {
  background-color: #cce5ff;
  padding: 10px;
  border-radius: 8px;
  margin-left: 30%;
  max-width: 70%;
}

.assistant-message {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 8px;
  margin-right: 30%;
  max-width: 70%;
}
</style>
