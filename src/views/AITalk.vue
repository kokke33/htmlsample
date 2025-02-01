<template>
  <div class="ai-talk">
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
        placeholder="質問を入力..."
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
      checkInput: {
        agent: "compareAgent",
        inputs: { array: [":userInput.text", "!=", "/bye"] },
      },
      userInput: {
        // Sample questions:
        // - How many Rs are in strawberry?
        // - Which is larger, .9 or .11?
        agent: "textInputAgent",
        params: {
          message: "Question:",
        },
      },
      messages: {
        agent: "pushAgent",
        inputs: {
          array: [],
          items: [
            {
              role: "system",
              content: `
              　回答は日本語でお願いします。
                あなたは、推論を段階的に説明する専門のAIアシスタントです。
                各ステップについて、そのステップで行っている内容を説明するタイトルと、それに対応する内容を提供してください。
                次のステップが必要か、それとも最終的な答えを出す準備ができているかを判断してください。
                応答はJSON形式で返してください。
                その際、キーとして「title（タイトル）」、「content（内容）」、「next_action（次のアクション：'continue' または 'final_answer'）」を使用してください。
                
                できるだけ多くの推論ステップを使用し、最低3ステップは必要です。
                自分がLLM（大規模言語モデル）としての限界を認識し、自分ができることとできないことを把握してください。
                推論の中で代替の答えを探ることを含めてください。自分が間違っている可能性を考慮し、その場合どこで間違ったのかも考えてください。
                あらゆる可能性を完全に検証してください。間違うこともあることを認識してください。
                
                「再検討している」と言う場合は、実際に再検討を行い、別のアプローチを使用してください。ただ単に「再検討している」と言うだけではいけません。
                答えを導くために最低でも5つの方法を使用してください。
                常にベストプラクティスを用いてください。

                以下は上記JSONレスポンス例です:
                {
                  "title": "重要な情報の特定",
                  "content": "この問題を解決するためには、与えられた情報を慎重に検討し、解決プロセスを導く重要な要素を特定する必要があります。これには以下が含まれます...",
                  "next_action": "continue"
                }
              `,
            },
            {
              role: "user",
              content: ":userInput.text",
            },
            {
              role: "assistant",
              content: "Thank you! I will now think step by step following my instructions, starting at the beginning after decomposing the problem.",
            },
          ],
        },
      },
      subGraph: {
        agent: "nestedAgent",
        inputs: {
          messages: ":messages.array",
        },
        isResult: true,
        graph: {
          loop: {
            while: ":continue",
          },
          nodes: {
            messages: {
              value: [],
              update: ":updatedMessages.array",
              // console: { after:true},
            },
            messages2: {
              value: [],
              update: ":reducer.array",
              // console: { after:true},
            },
            continue: {
              value: true,
              update: ":evaluator.continue",
            },
            llm: {
              // Sends those messages to LLM to get a response.
              agent: "openAIFetchAgent",
              params: {
                model: "gpt-4o-mini",
                apiKey: openApiKey,
                stream: true,
                response_format: {
                  type: "json_object",
                },
              },
              inputs: { messages: ":messages" },
              // console: { after:true},
            },
            updatedMessages: {
              agent: "pushAgent",
              inputs: {
                array: ":messages",
                item: {
                  role: "assistant",
                  content: ":llm.text",
                },
              },
            },
            output: {
              agent: "stringTemplateAgent",
              // console: {
              //   after: true,
              // },
              params: { template: "\n[${title}]\n${content}" },
              inputs: {
                title: ":llm.text.jsonParse().title",
                content: ":llm.text.jsonParse().content",
              },
            },
            evaluator: {
              // console: {after: true, before: true},
              agent: "propertyFilterAgent",
              inputs: {
                array: [{}, ":llm.text.jsonParse().next_action"],
              },
              params: {
                inspect: [{ propId: "continue", equal: "continue", from: 1 }],
              },
              // params: { inpect: [{ propId: "continue", equal: "continue", from: 1 }] },
            },
            reducer: {
              // Appends the new LLM response to messages
              agent: "pushAgent",
              inputs: {
                array: ":messages2", 
                item: ":llm.text.jsonParse().content"
              },
              // console: { after:true},
              isResult: true,
            },
          },
        },
      },
      echo2: {
        agent: "echoAgent",
        params: {
          message: ":subGraph.reducer",
        },
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
  console.log("Stream data received:", data); // デバッグ
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
      content: 
`このツールは、あなたの質問に対して段階的な思考プロセスを展開します。

■ 特徴
・各ステップで何を考えているか明確に説明
・複数の視点からの分析
・論理的な推論プロセスの可視化

■ 使い方
1. 解決したい問題や疑問を入力してください
2. AIが段階的に思考プロセスを展開します
3. 各ステップごとに理由や根拠を示します

それでは、あなたの質問をお聞かせください。`
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
    console.log(`Node: ${nodeId}, State: ${state}, Result:`, result);
    if (state === "completed" && result) {
      if (nodeId.includes("llm")) { // ノードIDの条件を修正
        console.log("LLM result:", result.message);
        streamText.value = ""; // ストリーミングをリセット
        const newMessages = [...messages.value, result.message];
        store.commit('updateAITalkMessages', newMessages);
        scrollToBottom();
      }
      if (nodeId === "userInput") {
        console.log("User Input result:", result.message);
        messages.value.push(result.message); // ユーザー入力も追加
      }
    }
  };

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