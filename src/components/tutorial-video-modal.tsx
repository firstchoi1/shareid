import Image from "next/image";

const MODAL_STORAGE_KEY = "shareid:tutorial-modal-unlock-at";
const MODAL_ROOT_ID = "shareid-tutorial-modal-root";

function buildModalScript(countdownSeconds: number) {
  const safeCountdown = Math.max(0, Math.floor(countdownSeconds));

  return `
    (() => {
      const root = document.getElementById("${MODAL_ROOT_ID}");
      if (!root) return;

      const dialog = root.querySelector("[data-tutorial-modal]");
      const closeButton = root.querySelector("[data-modal-close]");
      const closeLabel = root.querySelector("[data-modal-close-label]");
      const progressBar = root.querySelector("[data-modal-progress]");
      if (!dialog || !closeButton || !closeLabel) return;

      const storageKey = "${MODAL_STORAGE_KEY}";
      const countdownSeconds = ${safeCountdown};
      let unlockAt = 0;
      let timerId = null;

      const now = () => Date.now();

      const readUnlockAt = () => {
        try {
          const raw = window.sessionStorage.getItem(storageKey);
          if (!raw) return 0;
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : 0;
        } catch {
          return 0;
        }
      };

      const writeUnlockAt = (value) => {
        try {
          window.sessionStorage.setItem(storageKey, String(value));
        } catch {}
      };

      const clearUnlockAt = () => {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {}
      };

      const ensureUnlockAt = () => {
        if (countdownSeconds <= 0) return 0;
        const existing = readUnlockAt();
        if (existing > now()) return existing;
        const next = now() + countdownSeconds * 1000;
        writeUnlockAt(next);
        return next;
      };

      const getSecondsLeft = () => {
        if (countdownSeconds <= 0) return 0;
        return Math.max(0, Math.ceil((unlockAt - now()) / 1000));
      };

      const updateProgress = () => {
        if (!progressBar) return;
        if (countdownSeconds <= 0) {
          progressBar.style.width = "100%";
          return;
        }
        const secondsLeft = getSecondsLeft();
        const elapsed = Math.max(0, Math.min(countdownSeconds, countdownSeconds - secondsLeft));
        const percent = Math.max(0, Math.min(100, (elapsed / countdownSeconds) * 100));
        progressBar.style.width = percent + "%";
      };

      const setButtonState = (enabled) => {
        closeButton.disabled = !enabled;
        closeButton.setAttribute("aria-disabled", enabled ? "false" : "true");
        closeLabel.textContent = enabled ? "我已知晓" : "请等待（" + getSecondsLeft() + "秒）";
      };

      const stopTimer = () => {
        if (timerId !== null) {
          window.clearInterval(timerId);
          timerId = null;
        }
      };

      const refresh = () => {
        if (countdownSeconds <= 0) {
          setButtonState(true);
          updateProgress();
          stopTimer();
          return;
        }

        const secondsLeft = getSecondsLeft();
        if (secondsLeft <= 0) {
          clearUnlockAt();
          setButtonState(true);
          updateProgress();
          stopTimer();
          return;
        }

        setButtonState(false);
        updateProgress();
      };

      const closeModal = () => {
        dialog.setAttribute("hidden", "hidden");
        dialog.style.display = "none";
        stopTimer();
      };

      const tryClose = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        refresh();
        if (countdownSeconds <= 0 || getSecondsLeft() <= 0) {
          closeModal();
        }
      };

      unlockAt = ensureUnlockAt();
      refresh();

      if (countdownSeconds > 0 && getSecondsLeft() > 0) {
        timerId = window.setInterval(refresh, 250);
      }

      closeButton.addEventListener("click", tryClose, { passive: false });
      closeButton.addEventListener("touchend", tryClose, { passive: false });
      closeButton.addEventListener("pointerup", tryClose, { passive: false });

      window.addEventListener("focus", refresh, { passive: true });
      window.addEventListener("pageshow", refresh, { passive: true });
      window.addEventListener("orientationchange", refresh, { passive: true });
      document.addEventListener("visibilitychange", refresh, { passive: true });
      document.addEventListener("touchstart", refresh, { passive: true });
      document.addEventListener("touchend", refresh, { passive: true });
    })();
  `;
}

export function TutorialVideoModal({
  purchaseUrl,
  countdownSeconds,
}: {
  purchaseUrl: string;
  countdownSeconds: number;
}) {
  const safeCountdown = Math.max(0, Math.floor(countdownSeconds));

  return (
    <>
      <div
        id={MODAL_ROOT_ID}
        data-countdown-seconds={safeCountdown}
        className="contents"
      >
        <div
          data-tutorial-modal
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-2 backdrop-blur-[2px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="usage-warning-title"
        >
          <div className="max-h-[calc(100vh-1rem)] w-full max-w-[24rem] overflow-y-auto rounded-[26px] bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] sm:max-h-[calc(100vh-2rem)] sm:max-w-md sm:rounded-[32px]">
            <div className="px-4 pb-4 pt-4 text-center sm:px-8 sm:pb-6 sm:pt-7">
              <h2
                id="usage-warning-title"
                className="text-[1.65rem] font-extrabold tracking-wide text-red-600 sm:text-[2.1rem]"
              >
                使用必读
              </h2>

              <div className="mt-3 space-y-2.5 text-left text-[14px] leading-7 text-slate-600 sm:mt-6 sm:space-y-4 sm:text-[15px] sm:leading-8">
                <p>
                  <span className="font-semibold text-red-600">共享ID为多人共用，存在较高风险。</span>
                  如被他人利用，可能导致设备被锁、个人信息泄露及财产损失。
                </p>
                <p>
                  只可以在 <span className="font-semibold text-slate-800">App Store 商店</span> 登录下载，
                  <span className="font-semibold text-red-600">禁止登录设置</span>，以防被恶意锁机。
                </p>
                <p>
                  为保障您的账号与设备安全，建议购买独享ID使用。
                  <a
                    href={purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-1 inline-flex rounded-xl bg-[#1677ff] px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f67e6]"
                  >
                    点我购买独享ID
                  </a>
                  一人一号。
                </p>
                <p className="text-center text-[1.2rem] font-semibold leading-8 text-red-600 sm:text-[1.2rem] sm:leading-9">
                  共享账号严禁借给朋友使用，若因朋友登录设置造成锁机后果自己承担
                </p>
              </div>

              <div className="mt-4 overflow-hidden rounded-[18px] bg-[#0b0b0f] px-3 py-3 text-white sm:mt-6 sm:rounded-[22px] sm:px-4 sm:py-5">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/apple-settings.svg"
                    alt="设置"
                    width={40}
                    height={40}
                    className="size-10 rounded-2xl object-contain sm:size-12"
                  />
                  <div className="text-left">
                    <p className="text-xs text-white/60 sm:text-sm">设置</p>
                    <p className="text-[1.25rem] font-bold leading-tight text-white sm:text-[1.7rem]">
                      <span className="mr-2 text-[#ff7a45]">✕</span>
                      禁止登录设置！
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2.5 sm:mt-5">
                  <Image
                    src="/apple-store.svg"
                    alt="App Store"
                    width={40}
                    height={40}
                    className="size-10 rounded-2xl object-contain sm:size-12"
                  />
                  <div className="text-left">
                    <p className="text-xs text-white/60 sm:text-sm">App Store</p>
                    <p className="text-[1.25rem] font-bold leading-tight text-white sm:text-[1.7rem]">
                      <span className="mr-2 text-[#52c41a]">✓</span>
                      使用账号下载东西
                    </p>
                    <p className="text-[1.02rem] font-bold leading-tight text-white sm:text-[1.05rem]">
                      只在 App Store 登录！
                    </p>
                  </div>
                </div>
              </div>

              {safeCountdown > 0 ? (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 sm:mt-7" aria-hidden>
                  <div
                    data-modal-progress
                    className="h-full w-0 origin-left rounded-full bg-[#1677ff] transition-[width] duration-300 ease-linear"
                  />
                </div>
              ) : null}

              <button
                type="button"
                data-modal-close
                disabled={safeCountdown > 0}
                aria-disabled={safeCountdown > 0 ? "true" : "false"}
                className="mt-4 w-full touch-manipulation rounded-full px-6 py-3.5 text-[1rem] font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 enabled:bg-[#1677ff] enabled:shadow-[0_12px_28px_rgba(22,119,255,0.3)] enabled:hover:bg-[#0f67e6] sm:mt-7 sm:py-5 sm:text-[1.3rem]"
              >
                <span data-modal-close-label>
                  {safeCountdown > 0 ? `请等待（${safeCountdown}秒）` : "我已知晓"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: buildModalScript(safeCountdown) }} />
    </>
  );
}
