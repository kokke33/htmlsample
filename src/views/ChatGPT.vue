
<template>
  <div class="chatgpt-container">
    <p class="explanation-text">シンプルにChatGPTに質問したいときに利用。無料版でも十分に回答してもらえます。</p>
    <a href="https://chat.openai.com" target="_blank" class="chatgpt-link">ChatGPTを開く</a>
  </div>
</template>

<style scoped>
.chatgpt-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.explanation-text {
  margin-bottom: 20px;
  text-align: center;
  color: #666;
  font-size: 1em;
}

.chatgpt-link {
  display: inline-block;
  padding: 12px 24px;
  background-color: #10a37f;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 1.1em;
  transition: background-color 0.3s;
}

.chatgpt-link:hover {
  background-color: #0c8a6a;
}
</style>
