const conversationsEnUS = {
  list: {
    title: "Conversations",
    subtitle:
      "View and manage customer conversations, messages, and assignments",
    searchPlaceholder: "Search: customer / lead / message content",
    scopeLabel: "Scope",
    scope: {
      mine: "Mine",
      group: "Group",
      all: "All (Admin)",
    },
    filters: {
      statusAll: "All statuses",
      statusOpen: "Open",
      statusClosed: "Closed",
      ownerAll: "All owners",
      unreadOnly: "Unread only",
      reset: "Reset",
    },
    filterSummary: "Viewing: {scope} · {count} items",
    columns: {
      conversation: "Conversation",
      lastMessage: "Last message",
      status: "Status",
      owner: "Owner",
      linkedEntity: "Linked to",
      updated: "Last updated",
    },
    status: {
      open: "Open",
      closed: "Closed",
    },
    unread: {
      user: "Client unread",
      staffTenant: "Firm unread",
      staffOwner: "Owner unread",
      badge: "{count} unread",
    },
    empty: {
      title: "No conversations",
      description: "No conversations match the current filters.",
    },
    pagination: {
      summary: "Showing {start}–{end} of {total}",
      prev: "Previous",
      next: "Next",
    },
  },
  detail: {
    title: "Conversation detail",
    assignOwner: "Assign owner",
    reassign: "Reassign",
    close: "Close conversation",
    reopen: "Reopen",
    closedBanner:
      "This conversation is closed. The client can no longer send messages. Staff can still view the history.",
    linkedLead: "Linked lead",
    linkedCustomer: "Linked customer",
    linkedCase: "Linked case",
    noLinkedEntity: "Not linked",
    channel: "Channel",
    preferredLanguage: "Preferred language",
  },
  messages: {
    inputPlaceholder: "Type a message…",
    send: "Send",
    translationFailed: "Translation failed",
    retryTranslation: "Retry translation",
    forceOriginal: "Send original text",
    translationPending: "Translating…",
    systemEvent: "System message",
    kind: {
      text: "Text",
      system_event: "System event",
      intake_link: "Intake link",
      quote_link: "Quote link",
      sign_link: "Sign link",
    },
    visibility: {
      internal_only: "Internal only",
      client_visible: "Client-visible",
    },
    closedCannotSend:
      "This conversation is closed. New messages cannot be sent.",
  },
  errors: {
    fetchFailed: "Failed to load conversations. Please try again.",
    sendFailed: "Failed to send the message. Please try again.",
    assignFailed: "Failed to assign the conversation. Please try again.",
    closeFailed: "Failed to close the conversation. Please try again.",
    reopenFailed: "Failed to reopen the conversation. Please try again.",
    retryTranslationFailed: "Failed to retry translation. Please try again.",
  },
  toast: {
    messageSent: {
      title: "Message sent",
      description: "Message delivered successfully",
    },
    assigned: {
      title: "Conversation assigned",
      description: "Assigned to {owner}",
    },
    closed: {
      title: "Conversation closed",
      description: "The client will no longer be able to send new messages",
    },
    reopened: {
      title: "Conversation reopened",
      description: "The client can send messages again",
    },
    translationRetried: {
      title: "Translation resubmitted",
      description: "The message has been re-queued for translation",
    },
  },
} as const;

export default conversationsEnUS;
