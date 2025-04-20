
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
        placeholder="検索したいキーワードや質問を入力してください..."
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
import * as openai_fetch_agent from '@graphai/openai_fetch_agent'
import { streamAgentFilterGenerator } from '@graphai/agent_filters'
import { useStore } from 'vuex'; // Assuming Vuex is used

const store = useStore();

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
      userInput: {
        agent: "textInputAgent",
        params: {
          message: "You:",
        },
        // console: {after:true},
      },
      checkInput: {
        agent: "compareAgent",
        inputs: { array: [":userInput.text", "!=", "/bye"] },
      },

      // 検索クエリを生成
      createQuery: {
        console: {
          before: "...検索クエリを生成中",
        },
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4.1-mini",
          apiKey: openApiKey,
          stream: true,
        },
        inputs: { 
          prompt: `以下のユーザー入力から、検索に適した簡潔なキーワードを英語で抽出してください。
          出力は検索キーワードのみとし、説明などは含めないでください。
          
          ユーザー入力: "${:userInput.text}"` 
        }
      },
      
      // 通常の回答生成
      directResponse: {
        console: {
          before: "...直接回答を生成中",
        },
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4.1-mini",
          apiKey: openApiKey,
          stream: true,
        },
        inputs: { 
          prompt: `${:userInput.text}` 
        }
      },
      
      // まとめて回答を生成
      finalResponse: {
        console: {
          before: "...最終回答を生成中",
        },
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4.1-mini",
          apiKey: openApiKey,
          stream: true,
        },
        inputs: { 
          prompt: `以下の質問に対して、あなたが持っている知識を使って、わかりやすく日本語で回答してください。

質問: ${:userInput.text}

検索キーワード: ${:createQuery.text}

最終的な回答を日本語で作成してください。`
        },
        isResult: true,
      },
      
      // メッセージ更新
      reducer: {
        agent: "pushAgent",
        inputs: { array: ":messages", 
                 items: [":userInput.message", { content: ":finalResponse.text", role: "assistant" }] },
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
このツールは検索に基づいた回答を生成します。

■ 使い方
1. 知りたい内容や質問を入力してください
2. AIが質問内容を分析し、適切な回答を提供します
3. 多くの情報や最新の知識を組み合わせて回答します

■ ヒント
・具体的な質問内容を明確に伝えましょう
・複雑な質問も歓迎します
・専門的なトピックについても質問できます

それでは、質問を入力してください。`
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
  const graph = new GraphAI(
    graph_data,
    {
      ...vanilla_agents,
      ...openai_fetch_agent,
      textInputAgent: agentInfoWrapper(textInputAgent),
    },
    { agentFilters },
  )
  graph.onLogCallback = async ({ nodeId, state, result }) => {
    if (state === "completed" && result) {
      // LLMを含むノードの完了時
      if (nodeId === "finalResponse") {
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

  await graph.run()
}

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
