export type ContainerStatus =
  | "In Yard"
  | "Gate Out Ready"
  | "On Hold"
  | "Discharged"
  | "Loaded";

export type HoldKind = "Customs" | "Payment" | "Documentation";

export type Container = {
  id: string;
  isoType: string;
  line: string;
  vessel: string;
  voyage: string;
  status: ContainerStatus;
  yardPosition: string;
  dischargedAt: string;
  freeDaysRemaining: number;
  grossWeightKg: number;
  holds: HoldKind[];
  consignee: string;
};

export type RequestKind =
  | "Gate Release"
  | "Reefer Plug-in"
  | "Customs Inspection"
  | "Reweigh";

export type RequestStatus = "Submitted" | "In Review" | "Approved" | "Rejected";

export type TerminalRequest = {
  id: string;
  containerId: string;
  kind: RequestKind;
  haulier: string;
  collectionDate: string;
  notes: string;
  status: RequestStatus;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "operator" | "supervisor";
  company: string;
};
