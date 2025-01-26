
<template>
  <div class="history-container">
    <h1>会話履歴</h1>
    
    <div class="history-sections">
      <div class="history-section">
        <h2>AIトーク履歴</h2>
        <div v-if="aiTalkHistory.length > 0" class="messages-area">
          <div v-for="(conversation, index) in aiTalkHistory" :key="index" class="conversation">
            <div v-for="(message, msgIndex) in conversation" :key="msgIndex">
              <div v-if="message.role === 'user'" class="user-message">{{ message.content }}</div>
              <div v-else class="assistant-message">{{ message.content }}</div>
            </div>
          </div>
        </div>
        <p v-else>履歴がありません</p>
      </div>

      <div class="history-section">
        <h2>AIアンサー履歴</h2>
        <div v-if="aiAnswerHistory.length > 0" class="messages-area">
          <div v-for="(conversation, index) in aiAnswerHistory" :key="index" class="conversation">
            <div v-for="(message, msgIndex) in conversation" :key="msgIndex">
              <div v-if="message.role === 'user'" class="user-message">{{ message.content }}</div>
              <div v-else class="assistant-message">{{ message.content }}</div>
            </div>
          </div>
        </div>
        <p v-else>履歴がありません</p>
      </div>

      <div class="history-section">
        <h2>プロンプト作成履歴</h2>
        <div v-if="makePromptHistory.length > 0" class="messages-area">
          <div v-for="(conversation, index) in makePromptHistory" :key="index" class="conversation">
            <div v-for="(message, msgIndex) in conversation" :key="msgIndex">
              <div v-if="message.role === 'user'" class="user-message">{{ message.content }}</div>
              <div v-else class="assistant-message">{{ message.content }}</div>
            </div>
          </div>
        </div>
        <p v-else>履歴がありません</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

const aiTalkHistory = computed(() => store.state.aiTalkHistory)
const aiAnswerHistory = computed(() => store.state.aiAnswerHistory)
const makePromptHistory = computed(() => store.state.makePromptHistory)
</script>

<style scoped>
.history-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.history-sections {
  display: grid;
  gap: 30px;
}

.history-section {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

.messages-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.conversation {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.user-message {
  background-color: #cce5ff;
  padding: 10px;
  border-radius: 8px;
  margin: 5px 0;
  margin-left: 20%;
  max-width: 80%;
}

.assistant-message {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 8px;
  margin: 5px 0;
  margin-right: 20%;
  max-width: 80%;
}
</style>
