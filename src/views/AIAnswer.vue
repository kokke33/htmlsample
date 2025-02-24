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
      echo: {
        agent: "echoAgent",
        params: {
          message: ":messages",
        },
        console: { after:true},
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

      // 
      // suggestIdea
      // 
      suggestIdea_LLM: {
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4o-mini",
          apiKey: openApiKey,
          stream: true,
        },
        isResult: true,
          inputs: { 
            messages: ":messages", prompt: ":userInput.text"
          },
        // console: { after:true},
      },
      appender: {
        agent: "pushAgent",
        inputs: { array: ":messages", 
                 items: [":userInput.message", { content: ":suggestIdea_LLM.text", role: "assistant" }] },
        // console: { after:true},
      },
      echo2: {
        agent: "echoAgent",
        params: {
          message: ":appender",
        },
        console: { after:true},
      },
      output: {
        agent: "stringTemplateAgent",
        // console: { after:true},
        inputs: {
          text: "\x1b[32mAgent\x1b[0m: ${:suggestIdea_LLM.text}",
        },
      },

      // 
      // evaluationIdeas
      // 
      evaluationIdeas: {
        agent: "stringTemplateAgent",
        inputs: {
           text: "${:suggestIdea_LLM.text}", user: ":userInput.text"
        },
        params: {
          template: {
            role: "assistant",
            content: `
                ベテランのプロジェクトマネージャとして、以下のアイデアを評価してください。

                アイデアの後を記載後、その次の行に２文字空けてから評価内容を記載してください。
                英語で考えて、結果はすべて日本語で表示すること。また、マークダウン形式は使用しないこと。
                [相談事]
                \${user}
                [アイデア]
                \${text}

                回答は「アイデアに対する評価は以下の通りです」といった文章から始めてください。
                `,
          },
        },
        // console: { after:true},
      },
      evaluationIdeas_LLM: {
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4o-mini",
          apiKey: openApiKey,
          stream: true,
        },
        isResult: true,
        inputs: { 
          prompt: [":evaluationIdeas.content"] 
        },
        // console: { after:true},
      },
      appender2: {
        agent: "pushAgent",
        inputs: { array: ":appender.array", 
                 items: [{ content: ":evaluationIdeas_LLM.text", role: "assistant" }] },
        // console: { after:true},
      },

      // 
      // selectTop3
      // 
      selectTop3: {
        agent: "stringTemplateAgent",
        inputs: {
           text: "${:suggestIdea_LLM.text}", evaluationIdeas: "${:evaluationIdeas_LLM.text}"
        },
        params: {
          template: {
            role: "assistant",
            content: `
              このアイデア中から最も適切で効率的なアイデアのトップ３を選定し、
              その選定理由も説明してください。
              英語で考えて、結果はすべて日本語で、かつマークダウン形式は使用しないこと。
              [アイデア]
              \${text}
              [評価]
              \${evaluationIdeas}`,
          },
        },
        console: { after:true},
      },
      selectTop3_LLM: {
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4o-mini",
          apiKey: openApiKey,
          stream: true,
        },
        isResult: true,
        inputs: { 
          prompt: [":selectTop3.content"] 
        },
        // console: { after:true},
      },
      appender3: {
        agent: "pushAgent",
        inputs: { array: ":appender.array", 
                 items: [{ content: ":selectTop3_LLM.text", role: "assistant" }] },
        // console: { after:true},
      },

      // 
      // nextQA
      // 
      nextQA: {
        agent: "stringTemplateAgent",
        inputs: {
           selectTop3: "${:selectTop3_LLM.text}"
        },
        params: {
          template: {
            role: "assistant",
            content: `
              あなたは経験豊富な相談者です。
              アドバイザーから提示された[対応案]を実施するにあたり、具体的で重要な質問を5つ厳選して提示してください。
              以下の点に注意してください：

              1.各質問は簡潔かつ明確に表現すること。
              2.質問は[対応案]の実施に直接関連し、重要な情報を引き出すものであること。
              3.空白行は使用せず、質問は連続して表示すること。
              4.結果はすべて日本語で表示すること。
              5.マークダウン形式は使用しないこと。
              6.回答時には「次の想定質問案です」から始めてください。

              [対応案]
              \${selectTop3}
              "`,
          },
        },
        console: { after:true},
      },
      nextQA_LLM: {
        agent: "openAIFetchAgent",
        params: {
          model: "gpt-4o-mini",
          apiKey: openApiKey,
          stream: true,
        },
        isResult: true,
        inputs: { 
          prompt: [":nextQA.content"] 
        },
        // console: { after:true},
      },
      // 最後の出力
      reducer: {
        agent: "pushAgent",
        inputs: { array: ":appender.array", 
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

const messages = ref(store.state.aiAnswerMessages || [ // Initialize from store if available
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
      // LLMを含むように変更
      if (nodeId.includes("LLM")) {
        streamText.value = ""
        const newMessages = [...messages.value, result.message];
        store.commit('updateAIAnswerMessages', newMessages);
        scrollToBottom()
      }
      if (nodeId === "userInput") {
        const newMessages = [...messages.value, result.message];
        store.commit('updateAIAnswerMessages', newMessages);
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