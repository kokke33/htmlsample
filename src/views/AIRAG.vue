
<template>
  <div class="ai-rag">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { GraphAI, agentInfoWrapper } from 'graphai';
import * as vanilla_agents from '@graphai/vanilla';
import * as openai_fetch_agent from '@graphai/openai_fetch_agent';
import { streamAgentFilterGenerator } from '@graphai/agent_filters';
import { useStore } from 'vuex';

const store = useStore();
const openApiKey = import.meta.env.VITE_OPEN_API_KEY;

const graph_data = {
  version: 0.5,
  nodes: {
    source: {
      value: `GraphAIは非同期データフロー実行エンジンです。
開発者がYAMLやJSONでエージェントワークフローを宣言的に記述することで、
エージェントアプリケーションを構築できます。

GraphAIには2種類のノードがあります。
計算ノードはエージェントに関連付けられ、特定の計算を実行します。
静的ノードは、コンピュータ言語の変数のように値のプレースホルダーです。

GraphAIは設計上、データフローグラフを非巡回にする必要がありますが、
ループ、ネスト、if/unless、マッピングなどの制御フローメカニズムが追加されています。`
    },
    query: {
      value: "",
      update: ":userInput.text"
    },
    chunks: {
      agent: "stringSplitterAgent",
      inputs: {
        text: ":source"
      },
      params: {
        separator: "\n\n"
      }
    },
    chunkEmbeddings: {
      agent: "stringEmbeddingsAgent",
      inputs: {
        array: ":chunks.contents"
      }
    },
    queryEmbedding: {
      agent: "stringEmbeddingsAgent",
      inputs: {
        item: ":query"
      }
    },
    similarities: {
      agent: "dotProductAgent",
      inputs: {
        matrix: ":chunkEmbeddings",
        vector: ":queryEmbedding.$0"
      }
    },
    sortedChunks: {
      agent: "sortByValuesAgent",
      inputs: {
        array: ":chunks.contents",
        values: ":similarities"
      }
    },
    referenceText: {
      agent: "tokenBoundStringsAgent",
      inputs: {
        chunks: ":sortedChunks"
      },
      params: {
        limit: 2000
      }
    },
    prompt: {
      agent: "stringTemplateAgent",
      inputs: {
        query: ":query",
        context: ":referenceText.content"
      },
      params: {
        template: "以下の文書を参考に質問に答えてください：\n${context}\n\n質問：${query}"
      }
    },
    llmResponse: {
      agent: "openAIFetchAgent",
      inputs: {
        prompt: ":prompt"
      },
      params: {
        model: "gpt-4.1-mini",
        apiKey: openApiKey,
        stream: true
      },
      isResult: true
    },
    output: {
      agent: "copyAgent",
      inputs: {
        text: ":llmResponse.text"
      },
      isResult: true
    }
  }
};

const userInput = ref("");
const inputPromise = ref([]);
const submit = () => {
  if (inputPromise.value.length > 0) {
    const task = inputPromise.value.shift();
    if (task) {
      task(userInput.value);
      userInput.value = "";
    }
  }
};

const textPromise = () => {
  return new Promise((resolved) => {
    const task = (message) => {
      resolved(message);
    };
    inputPromise.value.push(task);
  });
};

const textInputAgent = async (__context) => {
  const result = await textPromise();
  return {
    text: result,
    message: { role: "user", content: result }
  };
};

const streamText = ref("");
const outSideFunciton = (context, data) => {
  streamText.value = streamText.value + data;
};

const agentFilters = [{
  name: "streamAgentFilter",
  agent: streamAgentFilterGenerator(outSideFunciton)
}];

const messages = ref([{
  role: 'assistant',
  content: `
RAG (Retrieval Augmented Generation) デモへようこそ！

このデモでは、GraphAIについての質問に答えます。
入力された質問に対して、関連する情報を検索し、
それを基に回答を生成します。

例えば以下のような質問ができます：
・GraphAIとは何ですか？
・GraphAIのノードの種類は？
・GraphAIの制御フローについて教えて

質問を入力してください。`
}]);

const scrollToBottom = () => {
  setTimeout(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);
};

const runGraphAI = async () => {
  const graph = new GraphAI(
    graph_data,
    {
      ...vanilla_agents,
      ...openai_fetch_agent,
      textInputAgent: agentInfoWrapper(textInputAgent)
    },
    { agentFilters }
  );

  graph.onLogCallback = async ({ nodeId, state, result }) => {
    if (state === "completed" && result) {
      if (nodeId === "llmResponse") {
        streamText.value = "";
        const newMessages = [...messages.value, { role: "assistant", content: result.text }];
        messages.value = newMessages;
        scrollToBottom();
      }
      if (nodeId === "userInput") {
        const newMessages = [...messages.value, { role: "user", content: result.message.content }];
        messages.value = newMessages;
        scrollToBottom();
      }
    }
  };

  await graph.run();
};

runGraphAI();
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
