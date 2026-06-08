export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

export interface Profile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  color: string
  created_at: string
}

export interface Household {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  profile_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface ChoreDefinition {
  id: string
  household_id: string
  name: string
  category: string
  difficulty: 'light' | 'medium' | 'heavy'
  icon: string
  created_at: string
}

export interface WeeklyAssignment {
  id: string
  household_id: string
  week_start: string
  profile_id: string
  chore_id: string
  day_of_week: DayOfWeek
  completed: boolean
  created_at: string
  profile?: Profile
  chore?: ChoreDefinition
}

export interface ScheduleTemplate {
  id: string
  household_id: string
  name: string
  description: string
  preview_data: TemplatePreviewData
  created_at: string
}

export interface TemplatePreviewData {
  slots: {
    day: DayOfWeek
    chore_name: string
    chore_icon: string
    member_slot: number
  }[]
}

export interface ChangeProposal {
  id: string
  household_id: string
  proposed_by: string
  type: 'add_chore' | 'remove_chore' | 'reassign' | 'apply_template'
  description: string
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  votes_needed: number
  created_at: string
  proposer?: Profile
  votes?: ProposalVote[]
}

export interface ProposalVote {
  id: string
  proposal_id: string
  profile_id: string
  vote: boolean
  voted_at: string
  profile?: Profile
}

export interface TaskList {
  id: string
  household_id: string
  name: string
  type: 'shopping' | 'todo' | 'custom'
  color: string
  icon: string
  created_by: string
  created_at: string
  visibility: 'shared' | 'private'
  items?: TaskItem[]
}

export interface TaskItem {
  id: string
  list_id: string
  title: string
  description: string | null
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  due_date: string | null
  created_by: string
  created_at: string
  sort_order: number
  completer?: Profile
  creator?: Profile
}
