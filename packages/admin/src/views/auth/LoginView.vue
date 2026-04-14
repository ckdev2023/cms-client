<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { loginAdmin } from "../../auth/model/adminSession";
import Button from "../../shared/ui/Button.vue";
import { useLoginForm } from "./model/useLoginForm";

/**
 * 后台登录页，负责收集邮箱和密码并完成登录跳转。
 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const {
  fields,
  canSubmit,
  submitError,
  clearSubmitError,
  setSubmitError,
  resolveRedirectTarget,
} = useLoginForm();
const isSubmitting = ref(false);

async function handleSubmit() {
  clearSubmitError();

  if (!canSubmit.value) {
    setSubmitError(t("auth.login.validation"));
    return;
  }

  isSubmitting.value = true;

  try {
    loginAdmin({
      email: fields.email,
      password: fields.password,
    });

    await router.push(resolveRedirectTarget(route.query.redirect));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <span class="login-hero__badge">{{ t("auth.login.badge") }}</span>
      <h1 class="login-hero__title">{{ t("auth.login.title") }}</h1>
      <p class="login-hero__subtitle">{{ t("auth.login.subtitle") }}</p>

      <div class="login-hero__panel">
        <h2 class="login-hero__panel-title">
          {{ t("auth.login.helperTitle") }}
        </h2>
        <ul class="login-hero__list">
          <li>{{ t("auth.login.helperItems.workspace") }}</li>
          <li>{{ t("auth.login.helperItems.customers") }}</li>
          <li>{{ t("auth.login.helperItems.documents") }}</li>
        </ul>
      </div>
    </section>

    <section class="login-card" aria-labelledby="login-form-title">
      <div class="login-card__header">
        <p class="login-card__eyebrow">Gyosei OS Admin</p>
        <h2 id="login-form-title" class="login-card__title">
          {{ t("auth.login.formTitle") }}
        </h2>
        <p class="login-card__description">
          {{ t("auth.login.formDescription") }}
        </p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="login-field">
          <span class="login-field__label">{{
            t("auth.login.emailLabel")
          }}</span>
          <input
            v-model="fields.email"
            class="login-field__control"
            type="email"
            name="email"
            autocomplete="email"
            :placeholder="t('auth.login.emailPlaceholder')"
            @input="clearSubmitError"
          />
        </label>

        <label class="login-field">
          <span class="login-field__label">{{
            t("auth.login.passwordLabel")
          }}</span>
          <input
            v-model="fields.password"
            class="login-field__control"
            type="password"
            name="password"
            autocomplete="current-password"
            :placeholder="t('auth.login.passwordPlaceholder')"
            @input="clearSubmitError"
          />
        </label>

        <p v-if="submitError" class="login-form__error" role="alert">
          {{ submitError }}
        </p>

        <Button
          class="login-form__submit"
          type="submit"
          variant="filled"
          tone="primary"
          size="lg"
          :loading="isSubmitting"
          :disabled="!canSubmit"
        >
          {{ t("auth.login.submit") }}
        </Button>
      </form>

      <p class="login-card__hint">
        {{ t("auth.login.demoHint") }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 440px);
  background:
    radial-gradient(circle at top left, rgb(3 105 161 / 16%), transparent 36%),
    linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
}

.login-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 64px min(8vw, 96px);
}

.login-hero__badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  background: rgb(3 105 161 / 10%);
  color: var(--color-primary-7);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.login-hero__title {
  margin: 0;
  font-size: clamp(34px, 4vw, 56px);
  line-height: 1.02;
  letter-spacing: var(--letter-spacing-tight);
}

.login-hero__subtitle {
  margin: 0;
  max-width: 560px;
  font-size: 18px;
  line-height: 1.6;
  color: var(--color-text-2);
}

.login-hero__panel {
  max-width: 520px;
  padding: 24px;
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 24px;
  background: rgb(255 255 255 / 76%);
  box-shadow: var(--shadow-1);
  backdrop-filter: blur(16px);
}

.login-hero__panel-title {
  margin: 0 0 12px;
  font-size: var(--font-size-lg);
}

.login-hero__list {
  margin: 0;
  padding-inline-start: 20px;
  color: var(--color-text-2);
  line-height: 1.8;
}

.login-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  padding: 40px;
  background: rgb(255 255 255 / 92%);
  border-inline-start: 1px solid rgb(226 232 240 / 72%);
  box-shadow: -24px 0 48px rgb(15 23 42 / 4%);
}

.login-card__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-card__eyebrow {
  margin: 0;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.login-card__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
}

.login-card__description {
  margin: 0;
  color: var(--color-text-2);
  line-height: 1.6;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-text-2);
}

.login-field__control {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font: inherit;
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal),
    background-color var(--transition-normal);
}

.login-field__control::placeholder {
  color: var(--color-text-placeholder);
}

.login-field__control:hover {
  border-color: var(--color-border-input);
}

.login-field__control:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: var(--shadow-focus-ring);
  background: #fff;
}

.login-form__error {
  margin: -2px 0 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.login-form__submit {
  width: 100%;
}

.login-card__hint {
  margin: 0;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-3);
  color: var(--color-text-2);
  line-height: 1.6;
}

@media (max-width: 1023px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-hero {
    padding: 48px 24px 28px;
  }

  .login-card {
    padding: 28px 24px 40px;
    border-inline-start: 0;
    border-top: 1px solid rgb(226 232 240 / 72%);
    box-shadow: none;
  }
}

@media (max-width: 639px) {
  .login-hero__panel {
    padding: 18px;
    border-radius: 20px;
  }

  .login-card {
    padding-inline: 18px;
  }
}
</style>
