package ai

import (
	"encoding/json"
	"fmt"
	"strings"

	"edu-system/internal/ai/dto"
)

func buildPlanMessages(material dto.MaterialInput, cfg dto.GenerationConfig) []Message {
	system := strings.TrimSpace(`
Ты эксперт-методист для создания учебных тестов. Твоя задача — построить план генерации.
Верни только валидный JSON без Markdown.
Условия:
- не придумывай факты вне источника;
- учитывай полноту покрытия тем;
- цель: подготовка студентов к итоговому тестированию.
`)

	user := fmt.Sprintf(`
Сформируй план для 2-го слоя по данным ниже.

Материал:
%s

Параметры генерации:
%s

JSON-схема ответа:
{
  "summary": "string",
  "learning_objectives": ["string"],
  "topic_blocks": [{"topic":"string","weight_percent":0,"key_facts":["string"]}],
  "test_blueprint": {
    "variants_count": 0,
    "questions_per_variant": 0,
    "question_type_targets": [{"type":"single|multi|text|code","count":0,"focus":"string"}]
  },
  "assumptions": ["string"],
  "risks": ["string"]
}
`, toPromptJSON(material), toPromptJSON(cfg))

	return []Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}
}

func buildGenerationMessages(material dto.MaterialInput, cfg dto.GenerationConfig, plan dto.PlanOutput) []Message {
	system := strings.TrimSpace(`
Ты эксперт по разработке тестов и конспектов для студентов.
Верни только валидный JSON без Markdown.
Жесткие правила:
- все задания должны соответствовать материалу;
- соблюдай план 1-го слоя;
- вопросы должны быть разнообразными и практичными;
- формулировки должны быть понятны студентам.
`)

	user := fmt.Sprintf(`
Сгенерируй 2-й слой: варианты тестов, конспект и пример теста для подготовки.

Материал:
%s

Параметры:
%s

План от 1-го слоя:
%s

JSON-схема ответа:
{
  "test_variants": [{
    "title": "string",
    "instructions": "string",
    "questions": [{
      "question": "string",
      "type": "single|multi|text|code",
      "options": ["string"],
      "correct_answers": [0],
      "explanation": "string"
    }]
  }],
  "study_notes": {
    "title": "string",
    "summary": "string",
    "key_points": ["string"],
    "common_mistakes": ["string"],
    "preparation_advice": ["string"]
  },
  "practice_test": {
    "title": "string",
    "questions": [{
      "question": "string",
      "type": "single|multi|text|code",
      "options": ["string"],
      "correct_answers": [0],
      "explanation": "string"
    }]
  }
}
`, toPromptJSON(material), toPromptJSON(cfg), toPromptJSON(plan))

	return []Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}
}

func buildValidationMessages(
	material dto.MaterialInput,
	plan dto.PlanOutput,
	generated dto.GenerationOutput,
) []Message {
	system := strings.TrimSpace(`
Ты строгий академический валидатор.
Верни только валидный JSON без Markdown.
Нужно проверить соответствие конспекта, тестов и примера теста исходному материалу.
`)

	user := fmt.Sprintf(`
Выполни 3-й слой валидации.

Материал:
%s

План:
%s

Сгенерированный результат:
%s

JSON-схема ответа:
{
  "is_aligned": true,
  "alignment_score": 0,
  "issues": [{
    "severity": "low|medium|high|critical",
    "location": "string",
    "problem": "string",
    "recommendation": "string"
  }],
  "missing_topics": ["string"],
  "extra_topics": ["string"],
  "summary": "string"
}
`, toPromptJSON(material), toPromptJSON(plan), toPromptJSON(generated))

	return []Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}
}

func buildRefineMessages(
	material dto.MaterialInput,
	cfg dto.GenerationConfig,
	plan dto.PlanOutput,
	generated dto.GenerationOutput,
	validation dto.ValidationOutput,
) []Message {
	system := strings.TrimSpace(`
Ты финальный редактор-методист (4-й слой).
Верни только валидный JSON без Markdown.
Исправь все критичные/важные расхождения с методичкой и подготовь финальный пакет для преподавателя.
`)

	user := fmt.Sprintf(`
Выполни 4-й слой: доработка и финальная выдача для преподавателя.

Материал:
%s

Параметры:
%s

План:
%s

Черновик генерации:
%s

Отчет валидации:
%s

JSON-схема ответа:
{
  "teacher_summary": "string",
  "ready_for_use": true,
  "applied_fixes": ["string"],
  "unresolved_warnings": ["string"],
  "test_variants": [{
    "title": "string",
    "instructions": "string",
    "questions": [{
      "question": "string",
      "type": "single|multi|text|code",
      "options": ["string"],
      "correct_answers": [0],
      "explanation": "string"
    }]
  }],
  "study_notes": {
    "title": "string",
    "summary": "string",
    "key_points": ["string"],
    "common_mistakes": ["string"],
    "preparation_advice": ["string"]
  },
  "practice_test": {
    "title": "string",
    "questions": [{
      "question": "string",
      "type": "single|multi|text|code",
      "options": ["string"],
      "correct_answers": [0],
      "explanation": "string"
    }]
  }
}
`, toPromptJSON(material), toPromptJSON(cfg), toPromptJSON(plan), toPromptJSON(generated), toPromptJSON(validation))

	return []Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}
}

func toPromptJSON(v any) string {
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(raw)
}
