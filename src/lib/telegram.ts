/**
 * Telegram Bot Service
 * Handles all communication with the Telegram Bot API
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: {
    id: number;
    type: string;
    first_name?: string;
    username?: string;
  };
  date: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  return token;
}

function getApiUrl(method: string): string {
  return `${TELEGRAM_API_BASE}${getBotToken()}/${method}`;
}

/**
 * Send a message to a Telegram chat
 */
/**
 * Inline keyboard button type
 */
export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

/**
 * Inline keyboard markup type
 */
export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableNotification?: boolean;
    replyMarkup?: InlineKeyboardMarkup | object;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(getApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode,
        disable_notification: options?.disableNotification,
        reply_markup: options?.replyMarkup,
      }),
    });

    const data: TelegramResponse<TelegramMessage> = await response.json();

    if (!data.ok) {
      console.error('Telegram sendMessage error:', data.description);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Telegram sendMessage failed:', error);
    return null;
  }
}

/**
 * Get bot information
 */
export async function getMe(): Promise<TelegramUser | null> {
  try {
    const response = await fetch(getApiUrl('getMe'));
    const data: TelegramResponse<TelegramUser> = await response.json();

    if (!data.ok) {
      console.error('Telegram getMe error:', data.description);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Telegram getMe failed:', error);
    return null;
  }
}

/**
 * Set webhook URL for receiving updates
 */
export async function setWebhook(
  url: string,
  options?: {
    secretToken?: string;
    allowedUpdates?: string[];
  }
): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl('setWebhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: options?.secretToken,
        allowed_updates: options?.allowedUpdates || ['message'],
      }),
    });

    const data: TelegramResponse<boolean> = await response.json();

    if (!data.ok) {
      console.error('Telegram setWebhook error:', data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telegram setWebhook failed:', error);
    return false;
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl('deleteWebhook'), {
      method: 'POST',
    });

    const data: TelegramResponse<boolean> = await response.json();

    if (!data.ok) {
      console.error('Telegram deleteWebhook error:', data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telegram deleteWebhook failed:', error);
    return false;
  }
}

/**
 * Get webhook info
 */
export async function getWebhookInfo(): Promise<object | null> {
  try {
    const response = await fetch(getApiUrl('getWebhookInfo'));
    const data: TelegramResponse<object> = await response.json();

    if (!data.ok) {
      console.error('Telegram getWebhookInfo error:', data.description);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Telegram getWebhookInfo failed:', error);
    return null;
  }
}

/**
 * Answer callback query (acknowledge button press)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  options?: {
    text?: string;
    showAlert?: boolean;
  }
): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl('answerCallbackQuery'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: options?.text,
        show_alert: options?.showAlert,
      }),
    });

    const data: TelegramResponse<boolean> = await response.json();

    if (!data.ok) {
      console.error('Telegram answerCallbackQuery error:', data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telegram answerCallbackQuery failed:', error);
    return false;
  }
}

/**
 * Generate a deep link to start the bot with a specific payload
 */
export function generateStartLink(payload: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ProjektL_bot';
  return `https://t.me/${botUsername}?start=${payload}`;
}
