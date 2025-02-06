
<template>
  <main>
    <div class="content">
      <h1>QAナビ</h1>
      <p class="description">
        QAナビは、漠然とした疑問や課題を、AIとの対話を通じて具体的な質問に変換し、そしてその質問に対して最適な回答を提供する2段階式のシステムです。質問（Question）から最適な回答（Answer）へとナビゲートしてくれるAIアシスタントです。
      </p>

      <h2>なぜQAナビが画期的なのか？</h2>
      <table class="features-table">
        <tr>
          <th>ポイント</th>
          <th>説明</th>
        </tr>
        <tr>
          <td>使いやすさ</td>
          <td>AIに詳しくなくても、誰でも簡単に利用できます。</td>
        </tr>
        <tr>
          <td>段階的アプローチ</td>
          <td>複雑な問題を小さな、取り組みやすいステップに分解してくれます。</td>
        </tr>
        <tr>
          <td>正確な回答</td>
          <td>具体化された質問によって、より的確で有用な回答が得られます。</td>
        </tr>
      </table>

      <h2>具体的な使用例</h2>
      <ol class="example-list">
        <li><strong>レポート作成支援</strong>「環境問題について書きたい」という漠然としたideaから、具体的なトピックや構成を提案してくれます。</li>
        <li><strong>就活対策</strong>「自己PRを作りたい」という要望に対し、経験の棚卸しから効果的なPRの作成まで、段階的にサポートします。</li>
        <li><strong>日常の悩み解決</strong>「健康的な生活を送りたい」という目標を、食事、運動、睡眠など具体的な行動計画に落とし込みます。</li>
      </ol>
    </div>
  </main>
</template>

<style scoped>
main {
  min-height: 100vh;
  background-color: #1a1f2c;
  color: #ffffff;
  padding: 40px 20px;
}

.content {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5em;
  color: #ffffff;
  margin-bottom: 1.5rem;
  text-align: center;
}

h2 {
  color: #ffffff;
  margin: 2rem 0 1rem 0;
  font-size: 1.8em;
}

.description {
  line-height: 1.8;
  margin-bottom: 2rem;
  font-size: 1.1em;
}

.features-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0 2.5rem 0;
  background-color: #2a2f3c;
  border-radius: 8px;
  overflow: hidden;
}

.features-table th,
.features-table td {
  padding: 15px;
  text-align: left;
  border: 1px solid #3a3f4c;
}

.features-table th {
  background-color: #2d3446;
  color: #ffffff;
  font-weight: bold;
}

.example-list {
  list-style-type: decimal;
  padding-left: 20px;
}

.example-list li {
  margin-bottom: 1.2rem;
  line-height: 1.6;
}

.example-list strong {
  color: #42b983;
  margin-right: 8px;
}
</style>
