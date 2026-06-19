async function saveToNotion(payload, turnstileToken) {
  await fetch("https://travel-alarm.xanderworkspace.workers.dev/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, cf_turnstile_response: turnstileToken }),
  });
}

const demoIframe = document.querySelector("#demo-iframe");
if (demoIframe) {
  demoIframe.addEventListener("error", () => demoIframe.classList.add("load-error"));
}

const betaForm = document.querySelector("#beta-form");
const formStatus = document.querySelector("#form-status");

betaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = betaForm.querySelector("button[type='submit']");
  const formData = new FormData(betaForm);
  const payload = Object.fromEntries(formData.entries());

  const turnstileToken = window.turnstile?.getResponse();
  if (!turnstileToken) {
    formStatus.textContent = "Verification not ready. Please wait a moment and try again.";
    formStatus.classList.add("error");
    formStatus.hidden = false;
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Sending...";
  formStatus.hidden = true;
  formStatus.classList.remove("error");

  try {
    const response = await fetch("https://formsubmit.co/ajax/travelalarm.app@gmail.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Submission failed");

    saveToNotion(payload, turnstileToken).catch(() => {});

    betaForm.reset();
    formStatus.textContent = "Thank you. You are on the beta list, and we will be in touch.";
    formStatus.hidden = false;
  } catch (error) {
    formStatus.textContent = "We could not send the form. Please try again or email travelalarm.app@gmail.com.";
    formStatus.classList.add("error");
    formStatus.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Join the beta";
  }
});
