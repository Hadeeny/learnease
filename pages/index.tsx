import React, { useEffect, useRef, useState } from "react";
import useLocalStorage from "@/lib/hooks/use-local-storage";
import HomeLayout from "@/components/layouts/home";
import Header from "@/components/home/header";
import AppFeatures from "@/components/home/features-section";
import AppDemo from "@/components/home/demo-section";
import OSS from "@/components/home/oss";
import PromptResponse from "@/components/app/result-response-section";
import SidebarDashboard from "@/components/dashboard/sidebar";
import Hero from "@/components/home/hero";

export default function Home({
  stars,
  profile,
}: {
  stars: number;
  profile: Array<any>;
}) {
  const [isGeneratingResponse, setIsGeneratingResponse] =
    useState<boolean>(false);
  const [savedPromptResponse, setSavedPromptResponse] = useState({});
  const [responseTitle, setResponseTitle] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [promptInputValue, setPromptInputValue] = useState<string>("");
  const [showSharer, setShowSharer] = useLocalStorage("show-sharer", false);
  const [usedAppCount, setUsedAppCount] = useLocalStorage("used-app-count", 0); // consider tracking with db
  const resultDivRef = useRef<null | HTMLDivElement>(null);
  const [openSidebar, setOpenSiderbar] = useState<boolean>(false);

  const [currentlyLoggedInUser, setCurrentlyLoggedInUser] =
    useState<Object | null>(null);

  const [savedPromptResponses, setSavedPromptResponses] = useState([]);

  // won't work if stream happens immediately
  const scrollToResult = () => {
    if (resultDivRef.current !== null) {
      resultDivRef.current.scrollIntoView({ behavior: "smooth" });
      return;
    }
    return;
  };

  const handleSubmit = async (prompt: string) => {
    console.log(usedAppCount > 3 && !currentlyLoggedInUser);
    if (usedAppCount > 3 && !currentlyLoggedInUser) {
      alert("Please log in to access unlimited LearnEase.");
      return;
    }

    setResponse(""); //reset previous response to show PlaceholderSections (isIDle)
    setResponseTitle(prompt || promptInputValue);
    scrollToResult();

    // Adding settimeout to allow scrollToResult work
    setTimeout(async () => {
      setIsGeneratingResponse(true);

      const response = await fetch("api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt || promptInputValue }),
      });

      if (!response.ok) {
        setIsGeneratingResponse(false);
        return;
      }

      // increase app use
      await fetch("api/app", {
        method: "POST",
      })
        .then(() => console.log("app use increased"))
        .catch((err) => console.log(err));

      // continue
      const data = response.body;

      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();

      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setResponse((prev) => prev + chunkValue);
      }
      setIsGeneratingResponse(false);
      setUsedAppCount(usedAppCount + 1);
      setSavedPromptResponse({});
      // show sharer for first time users
      if (!showSharer && usedAppCount + 1 === 1) {
        setShowSharer(true);
      }
    }, 1000);
  };

  useEffect(() => {
    const getProfile = async () => {
      const res = await fetch("/api/user");
      const { data } = await res.json();
      setCurrentlyLoggedInUser(data);
    };
    getProfile();
  }, []);

  const fetchSavedPromptResponses = async () => {
    const res = await fetch("/api/response");
    const { data } = await res.json();
    setSavedPromptResponses(data);
  };

  useEffect(() => {
    fetchSavedPromptResponses();
  }, []);

  return (
    <HomeLayout>
      <SidebarDashboard
        open={openSidebar}
        setOpen={setOpenSiderbar}
        savedPromptResponses={savedPromptResponses}
      />

      <Header setOpenSiderbar={setOpenSiderbar}>
        <Hero
          promptInputValue={promptInputValue}
          setPromptInputValue={setPromptInputValue}
          handleSubmit={handleSubmit}
          isGeneratingResponse={isGeneratingResponse}
          showSharer={showSharer}
        />
      </Header>
      <AppFeatures />
      <AppDemo />
      <section className='text-center mt-20'>
        <button className='rounded-2xl py-2 px-4 text-gray-700 text-base border border-green-600'>
          Over{" "}
          <span className='text-green-600 font-semibold'>1 hundred users</span>{" "}
          have used LearnEase so far
        </button>
      </section>

      <div ref={resultDivRef}></div>
      <PromptResponse
        currentlyLoggedInUser={currentlyLoggedInUser}
        isIdle={!response}
        handleSubmit={handleSubmit}
        isGeneratingResponse={isGeneratingResponse}
        response={response}
        responseTitle={responseTitle}
        fetchSavedPromptResponses={fetchSavedPromptResponses}
        savedPromptResponse={savedPromptResponse}
      />
      <OSS stars={stars || 2} />
    </HomeLayout>
  );
}

export async function getStaticProps() {
  const { stargazers_count: stars } = await fetch(
    "https://api.github.com/repos/unclebay143/learnease",
    {
      // optional – feel free to remove if you don't want to display star count
      ...(process.env.GITHUB_OAUTH_TOKEN && {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_OAUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      }),
    }
  ).then((res) => res.json());

  return {
    props: {
      stars,
    },
    revalidate: 60,
  };
}
