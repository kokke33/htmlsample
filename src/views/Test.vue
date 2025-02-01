
<template>
  <div class="container">
    <h1>Elevator Pitch Generator</h1>
    <button @click="runGraphAI" :disabled="loading">
      {{ loading ? '実行中...' : 'エレベータピッチ生成開始' }}
    </button>
    <div v-if="result" class="result-area">
      <h2>最終結果</h2>
      <pre>{{ result }}</pre>
    </div>
    <div v-if="logMessages.length" class="log-area">
      <h2>ログ</h2>
      <ul>
        <li v-for="(msg, index) in logMessages" :key="index">{{ msg }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { GraphAI } from 'graphai'
import * as vanilla_agents from '@graphai/vanilla'
import * as openai_fetch_agent from '@graphai/openai_fetch_agent'

const openApiKey = import.meta.env.VITE_OPEN_API_KEY

const graph_data = {
  version: 0.5,
  nodes: {
    source: {
      value: {
        inputDocumnets: [
          "https://gigazine.net/news/20250201-china-salmon/"
        ]
      }
    },
    nestedNode: {
      agent: "mapAgent",
      inputs: {
        rows: ":source.inputDocumnets"
      },
      graph: {
        version: 0.5,
        nodes: {
          fetchDocument: {
            agent: "fetchAgent",
            console: { before: "...fetching Document" },
            params: { type: "text" },
            inputs: { url: [":row"] }
          },
          node2: {
            agent: "stringTemplateAgent",
            params: { template: "${0}" },
            inputs: [":fetchDocument"],
            isResult: true
          },
          matome: {
            agent: "stringTemplateAgent",
            params: {
              template: [
                {
                  role: "system",
                  content: 
`あなたはベテランのプレゼンターです。 
以下の資料の情報をもとに、初見の人達が理解でき、興味を持ってもらえるような
エレベータピッチを作成してください。
余計な推論などは行わずに連携した資料からのみ情報を収集してください。

[資料]
${0}`
                }
              ]
            },
            inputs: [":node2"]
          },
          matomeGeneratorLLM: {
            agent: "openAIAgent",
            console: { before: "...generating matome" },
            params: {
              model: "gpt-4o-mini",
              apiKey: openApiKey
            },
            inputs: {
              prompt: 
`10分の発表時間を充足する分量で、エレベータピッチを推敲してください。
ステップバイステップで英語で考えてください。
回答するのは結果のみでよいですが、日本語で回答してください。`,
              messages: ":matome"
            },
            isResult: true
          },
          output: {
            agent: "stringTemplateAgent",
            params: {
              template: [
                { source: { content: "${0}" } },
                { matome: { content: "${1}" } }
              ]
            },
            inputs: [
              ":node2",
              ":matomeGeneratorLLM.choices.$0.message.content"
            ],
            isResult: true
          }
        }
      }
    },
    outputSum: {
      agent: "stringTemplateAgent",
      inputs: [
        ":nestedNode.output.$0.$0.source.content",
        ":nestedNode.output.$0.$1.matome.content",
        ":nestedNode.output.$1.$0.source.content",
        ":nestedNode.output.$1.$1.matome.content",
        ":nestedNode.output.$2.$0.source.content",
        ":nestedNode.output.$2.$1.matome.content"
      ],
      params: {
        template: "\e[34m■${0}\e[0m\n${1}\n\n\n\e[34m■${2}\e[0m\n${3}\n\n\n\e[34m■${4}\e[0m\n${5}\n\n\n"
      },
      console: { after: true }
    },
    outputSumOneLLM: {
      agent: "openAIAgent",
      console: { before: "...generating outputSumOne" },
      params: {
        model: "gpt-4o-mini",
        apiKey: openApiKey
      },
      inputs: {
        query: "GraphAIの魅力を10分の発表時間を充足するようにエレベータピッチを推敲してください。",
        prompt: ":outputSum"
      }
    },
    outputSumOne: {
      agent: "stringTemplateAgent",
      inputs: [
        ":outputSumOneLLM.choices.$0.message.content"
      ],
      params: {
        template: "\e[34m■outputSumOne\e[0m\n${0}"
      },
      console: { after: true }
    }
  }
}

const result = ref('')
const logMessages = ref([])
const loading = ref(false)

const onLogCallback = async ({ nodeId, state, result: nodeResult }) => {
  logMessages.value.push(`Node: ${nodeId}, State: ${state}`)
  if (nodeId === "outputSumOne" && state === "completed" && nodeResult) {
    result.value = nodeResult.message ? nodeResult.message.content : JSON.stringify(nodeResult)
    loading.value = false
  }
}

const runGraphAI = async () => {
  loading.value = true
  result.value = ''
  logMessages.value = []
  
  const graph = new GraphAI(
    graph_data,
    {
      ...vanilla_agents,
      ...openai_fetch_agent,
    }
  )
  graph.onLogCallback = onLogCallback
  
  try {
    await graph.run()
  } catch (error) {
    logMessages.value.push("エラーが発生しました: " + error)
    loading.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #999;
  cursor: not-allowed;
}

.result-area {
  margin-top: 20px;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-area {
  margin-top: 20px;
  background-color: #eef;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.9em;
}
</style>
