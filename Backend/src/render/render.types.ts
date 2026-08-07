export interface RenderJobPayload {
  postId: string; // Align this with your Prisma schema (String UUID/CUID or Int)
}

export interface RenderDecision {
  needsRendering: boolean;
  reason: string;
}