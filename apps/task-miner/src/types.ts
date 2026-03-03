export interface EventPayload {
    url: string;
    action_type: string;
    target_element: string;
    context_data: string;
    timestamp: string;
}

export interface BatchData {
    events: EventPayload[];
}
