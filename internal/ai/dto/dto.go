package dto

type PipelineRunRequest struct {
	Material         MaterialInput      `json:"material" binding:"required"`
	GenerationConfig GenerationConfig   `json:"generation_config"`
	Provider         *ProviderSelection `json:"provider,omitempty"`
}

type MaterialInput struct {
	Title          string `json:"title,omitempty"`
	Text           string `json:"text" binding:"required_without=SourceURL"`
	SourceURL      string `json:"source_url,omitempty" binding:"omitempty,url"`
	Language       string `json:"language,omitempty"`
	AdditionalNote string `json:"additional_note,omitempty"`
}

type GenerationConfig struct {
	VariantsCount        int    `json:"variants_count,omitempty"`
	QuestionsPerVariant  int    `json:"questions_per_variant,omitempty"`
	Difficulty           string `json:"difficulty,omitempty"`
	Audience             string `json:"audience,omitempty"`
	OutputLanguage       string `json:"output_language,omitempty"`
	IncludeExplanations  *bool  `json:"include_explanations,omitempty"`
	IncludePracticeTests *bool  `json:"include_practice_test,omitempty"`
}

type ProviderSelection struct {
	Order      []string            `json:"order,omitempty"`
	LayerOrder map[string][]string `json:"layer_order,omitempty"`
}

type PipelineRunResponse struct {
	Plan          PlanOutput           `json:"plan"`
	Draft         GenerationOutput     `json:"draft"`
	Validation    ValidationOutput     `json:"validation"`
	Final         FinalOutput          `json:"final"`
	ProviderTrace []LayerProviderTrace `json:"provider_trace"`
}

type PlanOutput struct {
	Summary            string        `json:"summary"`
	LearningObjectives []string      `json:"learning_objectives"`
	TopicBlocks        []TopicBlock  `json:"topic_blocks"`
	TestBlueprint      TestBlueprint `json:"test_blueprint"`
	Assumptions        []string      `json:"assumptions"`
	Risks              []string      `json:"risks"`
}

type TopicBlock struct {
	Topic         string   `json:"topic"`
	WeightPercent int      `json:"weight_percent"`
	KeyFacts      []string `json:"key_facts"`
}

type TestBlueprint struct {
	VariantsCount       int                  `json:"variants_count"`
	QuestionsPerVariant int                  `json:"questions_per_variant"`
	QuestionTypeTargets []QuestionTypeTarget `json:"question_type_targets"`
}

type QuestionTypeTarget struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
	Focus string `json:"focus"`
}

type GenerationOutput struct {
	TestVariants []TestVariant `json:"test_variants"`
	StudyNotes   StudyNotes    `json:"study_notes"`
	PracticeTest PracticeTest  `json:"practice_test"`
}

type TestVariant struct {
	Title        string              `json:"title"`
	Instructions string              `json:"instructions"`
	Questions    []GeneratedQuestion `json:"questions"`
}

type GeneratedQuestion struct {
	Question       string   `json:"question"`
	Type           string   `json:"type"`
	Options        []string `json:"options,omitempty"`
	CorrectAnswers []int    `json:"correct_answers,omitempty"`
	Explanation    string   `json:"explanation,omitempty"`
}

type StudyNotes struct {
	Title             string   `json:"title"`
	Summary           string   `json:"summary"`
	KeyPoints         []string `json:"key_points"`
	CommonMistakes    []string `json:"common_mistakes"`
	PreparationAdvice []string `json:"preparation_advice"`
}

type PracticeTest struct {
	Title     string              `json:"title"`
	Questions []GeneratedQuestion `json:"questions"`
}

type ValidationOutput struct {
	IsAligned      bool              `json:"is_aligned"`
	AlignmentScore int               `json:"alignment_score"`
	Issues         []ValidationIssue `json:"issues"`
	MissingTopics  []string          `json:"missing_topics"`
	ExtraTopics    []string          `json:"extra_topics"`
	Summary        string            `json:"summary"`
}

type ValidationIssue struct {
	Severity       string `json:"severity"`
	Location       string `json:"location"`
	Problem        string `json:"problem"`
	Recommendation string `json:"recommendation"`
}

type FinalOutput struct {
	TeacherSummary     string        `json:"teacher_summary"`
	ReadyForUse        bool          `json:"ready_for_use"`
	AppliedFixes       []string      `json:"applied_fixes"`
	UnresolvedWarnings []string      `json:"unresolved_warnings"`
	TestVariants       []TestVariant `json:"test_variants"`
	StudyNotes         StudyNotes    `json:"study_notes"`
	PracticeTest       PracticeTest  `json:"practice_test"`
}

type LayerProviderTrace struct {
	Layer        string   `json:"layer"`
	Provider     string   `json:"provider"`
	Model        string   `json:"model"`
	Attempts     int      `json:"attempts"`
	FallbackUsed bool     `json:"fallback_used"`
	Errors       []string `json:"errors,omitempty"`
}

type ProviderStatus struct {
	Name       string `json:"name"`
	Configured bool   `json:"configured"`
	Model      string `json:"model"`
}
