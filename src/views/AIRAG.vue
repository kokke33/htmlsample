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
        placeholder="質問を入力してください..."
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
import { useStore } from 'vuex'

const store = useStore()
const openApiKey = import.meta.env.VITE_OPEN_API_KEY

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

const messages = ref([{
  role: 'assistant',
  content: `RAGアシスタントへようこそ！

このツールは、あなたの質問に対して文脈を理解しながら回答を提供します。

■ 使い方
1. 質問を入力してください
2. AIが関連する情報を参照しながら回答します
3. 文脈を考慮した詳細な説明を提供します

それでは、質問をお聞かせください。`
}])

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
    {},
    {
      ...vanilla_agents,
      ...openai_fetch_agent,
      textInputAgent: agentInfoWrapper(textInputAgent),
    },
    { agentFilters }
  )

  graph.onLogCallback = async ({ nodeId, state, result }) => {
    if (state === "completed" && result) {
      if (nodeId.includes("llm")) {
        streamText.value = ""
        if (result.message) {
          const newMessages = [...messages.value, result.message]
          messages.value = newMessages
          store.commit('updateAIRAGMessages', newMessages)
          scrollToBottom()
        }
      }
      if (nodeId === "userInput" && result.message) {
        const newMessages = [...messages.value, result.message]
        messages.value = newMessages
        store.commit('updateAIRAGMessages', newMessages)
        scrollToBottom()
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