export interface AssignmentView {
  assignment_id: string;
  test_id: string;
  title: string;
  fields?: AssignmentFieldSpec[];
  share_url: string;
  manage_url?: string;
  duration_sec?: number;
  max_attempt_time_sec?: number;
  is_owner: boolean;
}

export interface CreateAssignmentRequest {
  test_id: string;
  title?: string;
  fields?: AssignmentFieldSpec[];
}

export interface AssignmentFieldSpec {
  key: string;
  label: string;
  required: boolean;
}
