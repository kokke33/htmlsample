<template>
  <nav>
    <router-link to="/">Home</router-link> |
    <router-link to="/make-prompt">MakePrompt</router-link> |
    <router-link to="/ai-answer">AI Answer</router-link> |
    <router-link to="/ai-talk">AI Talk</router-link> |
    <router-link to="/chatgpt">ChatGPT</router-link> |
    <router-link to="/ai-rag">AIRAG</router-link>
  </nav>
  <div class="router-view-container">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<style>
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  text-align: left;
  background-color: white;
  z-index: 100;
  border-bottom: 1px solid #e0e0e0;
}

.router-view-container {
  margin-top: 80px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  margin: 0 10px;
}

nav a.router-link-exact-active {
  color: #42b983;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  text-align: left;
}
</style>