export interface User {
  id: string;
  email: string;
  role: "teacher" | "student" | "admin";
  auth_method: "pre_created" | "email_password" | "google" | "microsoft";
  institution?: string;
  country?: string;
  created_at: string;
  is_active: boolean;
  firstName?: string;
  lastName?: string;
  institutionName?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  is_test_account?: boolean;
}

export interface Chatbot {
  id: string;
  owner_id: string;
  name: string;
  subject_area: string;
  education_level: "secondary" | "university";
  tone: "formal" | "friendly" | "technical";
  welcome_message?: string;
  system_prompt_override?: string;
  restriction_level: "strict" | "guided" | "open";
  llm_provider: string;
  public_url?: string;
  embed_code?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** Payload explícito para mutaciones de chatbot — evita casts `as Partial<Chatbot>` (MEN-03) */
export interface UpdateChatbotPayload {
  name?: string;
  subject_area?: string;
  education_level?: "secondary" | "university";
  tone?: "formal" | "friendly" | "technical";
  welcome_message?: string;
  system_prompt_override?: string;
  restriction_level?: "strict" | "guided" | "open";
  llm_provider?: string;
  is_published?: boolean;
}

export interface Document {
  id: string;
  chatbot_id: string;
  blob_url: string;
  filename: string;
  mime_type: string;
  status: "queued" | "processing" | "indexed" | "error";
  chunk_count: number;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export interface Message {
  id?: string;       // ID único opcional, usado internamente por ChatClient para identificar mensajes del assistant
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  student_id?: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  sources: string[];
}

export interface CreateChatbotData {
  name: string;
  subject_area: string;
  education_level: "secondary" | "university";
  tone?: "formal" | "friendly" | "technical";
  welcome_message?: string;
  system_prompt_override?: string;
  restriction_level?: "strict" | "guided" | "open";
  llm_provider?: string;
}

export interface CreateTeacherData {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  country?: string;
}

export interface UpdateTeacherData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  country?: string;
}

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  institution: string;
  country?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
}
