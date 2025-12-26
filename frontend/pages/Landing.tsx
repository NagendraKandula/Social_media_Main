import React, { useState } from "react";
import LHeader from "./LHeader";

export default function Landing() {
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  return (
    <>
      <LHeader setActivePlatform={setActivePlatform} />
      {/* rest of your page */}
    </>
  );
}
