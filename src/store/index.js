
import { createStore } from 'vuex'

export default createStore({
  state: {
    makePromptHistory: [],
    aiAnswerHistory: [],
    aiTalkHistory: []
  },
  mutations: {
    updateMakePromptHistory(state, messages) {
      state.makePromptHistory = messages
      localStorage.setItem('makePromptHistory', JSON.stringify(messages))
    },
    updateAIAnswerHistory(state, messages) {
      state.aiAnswerHistory = messages
      localStorage.setItem('aiAnswerHistory', JSON.stringify(messages))
    },
    updateAITalkHistory(state, messages) {
      state.aiTalkHistory = messages
      localStorage.setItem('aiTalkHistory', JSON.stringify(messages))
    },
    initializeHistory(state) {
      state.makePromptHistory = JSON.parse(localStorage.getItem('makePromptHistory') || '[]')
      state.aiAnswerHistory = JSON.parse(localStorage.getItem('aiAnswerHistory') || '[]')
      state.aiTalkHistory = JSON.parse(localStorage.getItem('aiTalkHistory') || '[]')
    }
  }
})
