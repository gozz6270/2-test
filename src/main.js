import "./style.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <div style="max-width: 720px; margin: 40px auto; padding: 16px;">
    <h2 style="margin: 0 0 12px 0;">저녁 메뉴 추천 챗봇</h2>
    <p id="keyWarning" style="color:#b00020; font-size: 14px; display:none;">
      환경변수 VITE_OPENAI_API_KEY가 설정되지 않았습니다. Netlify/Vite 빌드 환경에서 VITE_ 접두어로 설정하세요.
    </p>
    <div id="chat" style="border:1px solid #ddd; border-radius: 8px; padding: 12px; height: 360px; overflow:auto; background:#fff;">
      <div class="msg bot">안녕하세요! 오늘 기분과 상황을 알려주시면 딱 맞는 저녁 메뉴를 추천해 드릴게요 😊</div>
    </div>
    <form id="chatForm" style="display:flex; gap:8px; margin-top: 12px;">
      <input id="userInput" type="text" placeholder="예: 가볍게 먹고 싶고, 15분 내로 가능한 메뉴"
        style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px;" autocomplete="off" />
      <button id="sendBtn" type="submit" style="padding:10px 14px; border:none; background:#3b82f6; color:#fff; border-radius:6px; cursor:pointer;">
        보내기
      </button>
    </form>
    <p style="margin-top:8px; font-size:12px; color:#666;">
      클라이언트에서 직접 OpenAI를 호출합니다. 공개 환경에서는 키 노출에 유의하세요.
    </p>
  </div>
`;

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const keyWarning = document.getElementById("keyWarning");
if (!apiKey) {
  keyWarning.style.display = "block";
}

const chatEl = document.getElementById("chat");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  div.style.margin = "8px 0";
  div.style.whiteSpace = "pre-wrap";
  if (role === "bot") {
    div.style.background = "#f5f7fb";
    div.style.border = "1px solid #e5e7eb";
    div.style.borderRadius = "8px";
    div.style.padding = "8px 10px";
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function requestMenuSuggestion(userText) {
  if (!apiKey) {
    throw new Error("VITE_OPENAI_API_KEY 미설정");
  }

  const systemPrompt = [
    "당신은 친절한 저녁 메뉴 추천 도우미입니다.",
    "사용자의 기분, 예산, 준비 시간, 선호/알레르기, 인원수를 고려해 3가지 이내로 추천하세요.",
    "각 메뉴는 한 줄 요약, 예상 조리/주문 시간, 대체 옵션을 포함하세요.",
    "한국 기준 재료/식당을 가정하고, 부담 없는 말투를 사용하세요.",
  ].join(" ");

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `저녁 추천이 필요해요. 조건: ${userText}` },
    ],
    temperature: 0.7,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI 응답 오류: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("빈 응답을 받았습니다.");
  return content;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  appendMessage("user", text);
  inputEl.value = "";
  inputEl.focus();

  sendBtn.disabled = true;
  sendBtn.textContent = "생각중...";
  try {
    const reply = await requestMenuSuggestion(text);
    appendMessage("bot", reply);
  } catch (err) {
    appendMessage("bot", `오류가 발생했습니다: ${err?.message || err}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "보내기";
  }
});
