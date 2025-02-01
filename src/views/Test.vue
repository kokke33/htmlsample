
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
        placeholder="URLを入力してください..."
        rows="3"
      ></textarea>
      <button type="button" @click="submit">送信</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GraphAI, agentInfoWrapper } from 'graphai'
import * as vanilla_agents from '@graphai/vanilla'
import * as openai_fetch_agent from '@graphai/openai_fetch_agent'
import { streamAgentFilterGenerator } from '@graphai/agent_filters'

const openApiKey = import.meta.env.VITE_OPEN_API_KEY

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
        content: `あなたはベテランのプレゼンターです。 
提供されたURLの記事を読み取り、初見の人達が理解でき、興味を持ってもらえるような
エレベータピッチを作成してください。
余計な推論などは行わずに提供された資料からのみ情報を収集してください。
10分の発表時間を充足する分量で、エレベータピッチを推敲してください。
ステップバイステップで英語で考えてください。
回答するのは結果のみでよいですが、日本語で回答してください。`,
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
    fetchDocument: {
      agent: "fetchAgent",
      console: { before: "...fetching Document" },
      params: { type: "text" },
      inputs: { url: ":userInput.text" }
    },
    llm: {
      agent: "openAIFetchAgent",
      params: {
        apiKey: openApiKey,
        stream: true,
      },
      isResult: true,
      inputs: { 
        messages: ":messages",
        prompt: ":fetchDocument"
      },
    },
    reducer: {
      agent: "pushAgent",
      inputs: { array: ":messages", 
               items: [":userInput.message", { content: ":llm.text", role: "assistant" }] },
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

import { useStore } from 'vuex'
const store = useStore()
const messages = computed(() => {
  return store.state.aiTalkMessages.length > 0 
    ? store.state.aiTalkMessages 
    : [{
      role: 'assistant',
      content: `エレベータピッチ生成へようこそ！

このツールは、提供されたURLの記事からエレベータピッチを生成するアシスタントです。

■ 使い方
1. 記事のURLを入力してください
2. AIが記事を解析し、エレベータピッチを生成します
3. 10分程度の発表に適した内容を提案します

■ ヒント
・公開されているWebページのURLを入力してください
・記事は日本語で書かれているものを推奨します

それでは、URLを入力してください。`
    }]
})

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
      if (nodeId === "llm") {
        streamText.value = ""
        const newMessages = [...messages.value, result.message];
        store.commit('updateAITalkMessages', newMessages);
        scrollToBottom();
      }
      if (nodeId === "userInput") {
        messages.value.push(result.message);
        scrollToBottom();
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
  margin-top: 20px;
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
  margin-bottom: 20px;
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
