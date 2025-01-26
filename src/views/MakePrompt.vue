<template>
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
        placeholder="プロンプトを入力してください..."
        rows="3"
      ></textarea>
      <button type="button" @click="submit">送信</button>
    </div>
    
    <!-- <div ref="cytoscapeRef" style="width: 100%; height: 600px"></div> -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GraphAI, sleep, agentInfoWrapper } from 'graphai'
import { useCytoscape } from '@receptron/graphai_vue_cytoscape'
import { streamAgentFilterGenerator } from '@graphai/agent_filters'
import * as vanilla_agents from '@graphai/vanilla'
import * as openai_fetch_agent from '@graphai/openai_fetch_agent'

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
        content: `私はあなたに私のPromptエンジニアになってもらいたいと思っています。
        あなたの目標は私が必要とする最高のPromptを作ることを手助けすることです。
        Promptはあなた、ChatGPTによって使用されます。以下のプロセスに従ってください。

        あなたの最初の反応は、Promptが何についてであるべきかを尋ねることです。
        私は答えを提供しますが、次のステップを繰り返すことで改善する必要があります。

        私の入力に基づいて、2つのセクションを生成します。
        a）改訂されたPrompt（あなたが書き直したPromptを提供してください。それは明確で簡潔で、
        あなたによって簡単に理解できるものである必要があります）
        b）質問（Promptを改善するために私から必要な追加情報に関する関連する質問をしてください
        箇条書きリストで提示すること。）
        
        私が言うまで、あなたが追加情報を提供し、
        改訂PromptセクションでPromptを更新するという反復プロセスを続けます。
        その際、英語で考えて、すべて日本語で出力してください。
        ステップバイステップで考えてください。
        出力にはマークダウン形式を絶対に使わないこと。

        出力レイアウトは以下の通りです。

        ■改訂されたPrompt
        ■質問
          1.
          2.
        `,
      }],
      update: ":reducer.array",
    },
    userInput: {
      agent: "textInputAgent",
      params: {
        message: "You:",
      },
    },
    checkInput: {
      agent: "compareAgent",
      inputs: { array: [":userInput.text", "!=", "/bye"] },
    },
    llm: {
      agent: "openAIFetchAgent",
      params: {
        // model: "gpt-4o-mini",
        apiKey: openApiKey,
        stream: true,
      },
      isResult: true,
      inputs: { messages: ":messages", prompt: ":userInput.text" },
    },
    output: {
      agent: "stringTemplateAgent",
      console: {
        after: true,
      },
      inputs: {
        text: "\x1b[32mAgent\x1b[0m: ${:llm.text}",
      },
    },
    reducer: {
      agent: "pushAgent",
      inputs: { array: ":messages", 
               items: [":userInput.message", { content: ":llm.text", role: "assistant" }] },
    },
  },
}

const gl = computed(() => {
  return graph_data
})

// input
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

const { updateCytoscape, cytoscapeRef } = useCytoscape(gl)

// agent filters
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
    content: `プロンプトエンジニアリングへようこそ！

このツールは、より効果的なプロンプトを作成するためのアシスタントです。

■ 使い方
1. プロンプトの目的や要件を入力してください
2. AIがプロンプトの改善案を提示します
3. 質問に答えることで、プロンプトを段階的に改善できます

■ ヒント
・具体的な目的や制約を明確に伝えましょう
・必要な出力形式があれば指定してください
・専門用語や技術的な要件も遠慮なく含めてください

それでは、作成したいプロンプトについて教えてください。`
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

const result = ref("")
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
    console.log(`Node: ${nodeId}, State: ${state}, Result:`, result);
    if (state === "completed" && result) {
      if (nodeId.includes("llm")) { // ノードIDの条件を修正
        console.log("LLM result:", result.message);
        streamText.value = ""; // ストリーミングをリセット
        messages.value.push(result.message); // 結果を追加
        scrollToBottom();
      }
      if (nodeId === "userInput") {
        console.log("User Input result:", result.message);
        messages.value.push(result.message); // ユーザー入力も追加
        scrollToBottom();
      }
    }
  };
  const res = await graph.run()
  result.value = JSON.stringify(res)
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
