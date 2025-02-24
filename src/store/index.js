
import { createStore } from 'vuex'

export default createStore({
  state: {
    makePromptMessages: [],
    aiAnswerMessages: [],
    aiTalkMessages: []
  },
  mutations: {
    updateMakePromptMessages(state, messages) {
      state.makePromptMessages = messages
    },
    updateAIAnswerMessages(state, messages) {
      state.aiAnswerMessages = messages
    },
    updateAITalkMessages(state, messages) {
      state.aiTalkMessages = messages
    }
  }
})
