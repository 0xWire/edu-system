export type AIProviderName = 'openai' | 'gemini' | 'deepseek' | 'openrouter' | 'local';

export type AILayerName = 'plan' | 'generate' | 'validate' | 'refine';

export interface AIPipelineRunRequest {
  material: AIMaterialInput;
  generation_config?: AIGenerationConfig;
  provider?: AIProviderSelection;
}

export interface AIMaterialInput {
  title?: string;
  text?: string;
  source_url?: string;
  language?: string;
  additional_note?: string;
}

export interface AIGenerationConfig {
  variants_count?: number;
  questions_per_variant?: number;
  difficulty?: string;
  audience?: string;
  output_language?: string;
  include_explanations?: boolean;
  include_practice_test?: boolean;
}

export interface AIProviderSelection {
  order?: AIProviderName[];
  layer_order?: Partial<Record<AILayerName, AIProviderName[]>>;
}

export interface AIProviderStatus {
  name: AIProviderName;
  configured: boolean;
  model: string;
}

export interface AIPipelineRunResponse {
  plan: AIPlanOutput;
  draft: AIGenerationOutput;
  validation: AIValidationOutput;
  final: AIFinalOutput;
  provider_trace: AILayerProviderTrace[];
}

export interface AIPlanOutput {
  summary: string;
  learning_objectives: string[];
  topic_blocks: AITopicBlock[];
  test_blueprint: AITestBlueprint;
  assumptions: string[];
  risks: string[];
}

export interface AITopicBlock {
  topic: string;
  weight_percent: number;
  key_facts: string[];
}

export interface AITestBlueprint {
  variants_count: number;
  questions_per_variant: number;
  question_type_targets: AIQuestionTypeTarget[];
}

export interface AIQuestionTypeTarget {
  type: string;
  count: number;
  focus: string;
}

export interface AIGenerationOutput {
  test_variants: AITestVariant[];
  study_notes: AIStudyNotes;
  practice_test: AIPracticeTest;
}

export interface AITestVariant {
  title: string;
  instructions: string;
  questions: AIGeneratedQuestion[];
}

export interface AIGeneratedQuestion {
  question: string;
  type: string;
  options?: string[];
  correct_answers?: number[];
  explanation?: string;
}

export interface AIStudyNotes {
  title: string;
  summary: string;
  key_points: string[];
  common_mistakes: string[];
  preparation_advice: string[];
}

export interface AIPracticeTest {
  title: string;
  questions: AIGeneratedQuestion[];
}

export interface AIValidationOutput {
  is_aligned: boolean;
  alignment_score: number;
  issues: AIValidationIssue[];
  missing_topics: string[];
  extra_topics: string[];
  summary: string;
}

export interface AIValidationIssue {
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  location: string;
  problem: string;
  recommendation: string;
}

export interface AIFinalOutput {
  teacher_summary: string;
  ready_for_use: boolean;
  applied_fixes: string[];
  unresolved_warnings: string[];
  test_variants: AITestVariant[];
  study_notes: AIStudyNotes;
  practice_test: AIPracticeTest;
}

export interface AILayerProviderTrace {
  layer: AILayerName;
  provider: AIProviderName;
  model: string;
  attempts: number;
  fallback_used: boolean;
  errors?: string[];
}
