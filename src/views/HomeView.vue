
<template>
  <main>
    <h1>QAナビ</h1>
    <p class="app-link"><a href="https://htmlsample-kokke33.replit.app/" target="_blank">https://htmlsample-kokke33.replit.app/</a></p>
    
    <div class="description">
      <p>QAナビは、漠然とした疑問や課題を、AIとの対話を通じて具体的な質問に変換し、そしてその質問に対して最適な回答を提供する2段階式のシステムです。質問（Question）から最適な回答（Answer）へとナビゲートしてくれるAIアシスタントです。</p>

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
      <ul>
        <li><strong>レポート作成支援：</strong>「環境問題について書きたい」という漠然としたideaから、具体的なトピックや構成を提案してくれます。</li>
        <li><strong>就活対策：</strong>「自己PRを作りたい」という要望に対し、経験の棚卸しから効果的なPRの作成まで、段階的にサポートします。</li>
        <li><strong>日常の悩み解決：</strong>「健康的な生活を送りたい」という目標を、食事、運動、睡眠など具体的な行動計画に落とし込みます。</li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
main {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  margin-bottom: 1rem;
  text-align: center;
}

.app-link {
  text-align: center;
  margin-bottom: 2rem;
}

.app-link a {
  color: #42b983;
  text-decoration: none;
}

.description {
  line-height: 1.6;
}

.features-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0 2rem 0;
}

.features-table th,
.features-table td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}

.features-table th {
  background-color: #f5f5f5;
}

h2 {
  color: #2c3e50;
  margin: 2rem 0 1rem 0;
}

ul {
  padding-left: 20px;
}

li {
  margin-bottom: 1rem;
}

li strong {
  color: #2c3e50;
}
</style>
</template>
