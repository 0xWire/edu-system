export interface AssignmentView {
  assignment_id: string;
  test_id: string;
  title: string;
  share_url: string;
}

export interface CreateAssignmentRequest {
  test_id: string;
  title?: string;
}
