
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { generateMemeImage, type GenerateMemeImageOutput } from "@/ai/flows/generate-meme-image";
import { createCustomMeme } from "@/ai/flows/create-custom-meme";
import { submitMeme } from "@/ai/flows/submit-meme";
import { voteOnMeme } from "@/ai/flows/vote-on-meme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ArrowLeft, Loader2, Sparkles, FileUp, Palette, PenSquare, Laugh, X, Send } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const jokeCategories = [
    { id: "dad jokes", label: "Dad Jokes", sfw: true },
    { id: "dark humor", label: "Dark Humor", sfw: false },
    { id: "pick-up lines", label: "Pick-up Lines", sfw: true },
    { id: "crypto memes", label: "Crypto Memes", sfw: true },
    { id: "roasts", label: "Roasts", sfw: false },
    { id: "wholesome jokes", label: "Wholesome Jokes", sfw: true },
    { id: "ai jokes", label: "AI Jokes", sfw: true },
    { id: "edgy memes", label: "Edgy Memes", sfw: false },
];

export default function SubmitPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Meme Creation State
    const [mode, setMode] = useState<'generate' | 'create'>('generate');
    const [category, setCategory] = useState(jokeCategories[0].id);
    const [joke, setJoke] = useState<GenerateSafeJokeOutput | null>(null);
    const [memeImage, setMemeImage] = useState<GenerateMemeImageOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customMemeText, setCustomMemeText] = useState("");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const memeCardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
    const [votingStatus, setVotingStatus] = useState<Record<string, boolean>>({});

     useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setIsLoadingLeaderboard(true);
        try {
            const q = query(collection(db, "memes"), orderBy("voteCount", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            const jokes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeaderboard(jokes);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            toast({ title: "Error", description: "Could not load the leaderboard.", variant: "destructive" });
        } finally {
            setIsLoadingLeaderboard(false);
        }
    };

    const handleVote = async (memeId: string) => {
        if (!user) {
            toast({ title: "Login Required", description: "You need to be logged in to vote.", variant: "destructive"});
            return;
        }
        setVotingStatus(prev => ({...prev, [memeId]: true}));
        try {
            const result = await voteOnMeme({ memeId, userId: user.uid });
            if (result.success) {
                toast({ title: "Vote Counted!", description: "You made this meme funnier."});
                fetchLeaderboard(); // Refresh to show new vote count
            } else {
                 toast({ title: "Already Voted", description: result.message, variant: "destructive"});
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not cast your vote.", variant: "destructive"});
        } finally {
            setVotingStatus(prev => ({...prev, [memeId]: false}));
        }
    }


    const takeMemeScreenshot = async (): Promise<string | null> => {
        const element = memeCardRef.current;
        if (!element) return null;

        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(element, { useCORS: true, allowTaint: true, backgroundColor: null });
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error("Failed to capture meme screenshot:", error);
            return uploadedImage || memeImage?.imageDataUri || null;
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setJoke(null);
        setMemeImage(null);
        try {
            if (mode === 'create') {
                if (!customMemeText) {
                    toast({ title: "Meme Idea Needed", description: "Please describe your meme idea.", variant: "destructive" });
                    setIsLoading(false);
                    return;
                }
                const result = await createCustomMeme({ topic: customMemeText, imageDataUri: uploadedImage || undefined });
                setJoke({ joke: result.joke });
                setMemeImage({ imageDataUri: result.imageDataUri });
            } else {
                const selectedCategory = jokeCategories.find(cat => cat.id === category);
                if (!selectedCategory) throw new Error("Category not found");
                const jokeResult = await generateSafeJoke({ category, safeForWork: selectedCategory.sfw });
                setJoke(jokeResult);

                if (category === 'crypto memes' || category === 'edgy memes') {
                    const memeResult = await generateMemeImage({ category, safeForWork: selectedCategory.sfw, joke: jokeResult.joke });
                    if (memeResult) setMemeImage(memeResult);
                }
            }
        } catch (error) {
            console.error("Failed to generate:", error);
            toast({ title: "Error", description: "Oops! Something went wrong.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = async () => {
        if (!user) {
            toast({ title: "Not Logged In", description: "You must be logged in to submit a meme.", variant: "destructive" });
            return;
        }
        if (!joke || (!memeImage && !uploadedImage)) {
            toast({ title: "Incomplete Meme", description: "Please generate a full meme with an image before submitting.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const finalImageUri = await takeMemeScreenshot();
            if (!finalImageUri) {
                throw new Error("Could not capture the final meme image.");
            }

            await submitMeme({
                userId: user.uid,
                joke: joke.joke,
                imageDataUri: finalImageUri,
            });
            
            toast({ title: "Meme Submitted!", description: "Thanks for making the world funnier! Your meme is now on the leaderboard." });
            setJoke(null);
            setMemeImage(null);
            setUploadedImage(null);
            setCustomMemeText('');

            // Refresh leaderboard
            fetchLeaderboard();


        } catch (error: any) {
            console.error("Submission failed:", error);
            toast({ title: "Submission Error", description: error.message || "Could not submit your meme.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCategoryChange = (value: string) => {
        setCategory(value);
        setJoke(null);
        setMemeImage(null);
    };

    const handleModeChange = (newMode: 'generate' | 'create') => {
        setMode(newMode);
        setJoke(null);
        setMemeImage(null);
        setUploadedImage(null);
        setCustomMemeText('');
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setJoke(null);
                setMemeImage(null);
            };
            reader.readAsDataURL(file);
        } else {
            toast({ title: "Invalid File", description: "Please upload a valid image file.", variant: "destructive" });
        }
    };

    const splitJoke = (text: string): { top: string; bottom: string } => {
        if (!text) return { top: '', bottom: '' };
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length >= 2) {
            const middleIndex = Math.ceil(sentences.length / 2);
            return { top: sentences.slice(0, middleIndex).join(' ').trim(), bottom: sentences.slice(middleIndex).join(' ').trim() };
        }
        const words = text.split(' ');
        if (words.length === 1) return { top: text, bottom: '' };
        const middleIndex = Math.ceil(words.length / 2);
        return { top: words.slice(0, middleIndex).join(' '), bottom: words.slice(middleIndex).join(' ') };
    };

    const MemeText = ({ text }: { text: string }) => (
        <p className="w-full text-center text-2xl md:text-3xl font-bold uppercase text-white break-words px-2"
           style={{ textShadow: '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 2px 0px 0 #000, -2px 0px 0 #000, 0px 2px 0 #000, 0px -2px 0 #000, 2px 2px 5px rgba(0,0,0,0.5)' }}>
            {text}
        </p>
    );

    const isMemeReady = joke && (memeImage?.imageDataUri || uploadedImage);
    const { top, bottom } = splitJoke(joke?.joke || '');

    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 pt-12 dark">
            <main className="w-full max-w-7xl mx-auto flex flex-col items-center space-y-10">
                <header className="text-center w-full relative">
                    <Button asChild variant="ghost" className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full">
                       <Link href="/"><ArrowLeft className="mr-2" /> Back to Jokes</Link>
                    </Button>
                    <h1 className="text-5xl md:text-6xl font-bold font-headline text-primary">Community Hub</h1>
                    <p className="text-lg text-muted-foreground">Submit your masterpiece and climb the leaderboard!</p>
                </header>

                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Creation and Submission */}
                    <div className="space-y-6">
                        <Card className="w-full bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl">
                             <CardHeader>
                                <CardTitle className="text-2xl font-bold">1. Create Your Meme</CardTitle>
                                <CardDescription>Generate a joke or create your own, then submit it.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <div className="flex justify-center p-1 mb-6 bg-card/80 backdrop-blur-lg rounded-full shadow-inner border">
                                    <Button onClick={() => handleModeChange('generate')} variant={mode === 'generate' ? 'secondary' : 'ghost'} className="flex-1 rounded-full"><Laugh className="mr-2 h-5 w-5"/>Generate</Button>
                                    <Button onClick={() => handleModeChange('create')} variant={mode === 'create' ? 'secondary' : 'ghost'} className="flex-1 rounded-full"><PenSquare className="mr-2 h-5 w-5"/>Create</Button>
                                </div>
                                {mode === 'generate' ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {jokeCategories.map(cat => (
                                            <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} data-state={category === cat.id ? 'active' : 'inactive'} className="px-3 py-2 text-sm font-semibold rounded-full transition-colors data-[state=inactive]:bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Textarea placeholder="What's your meme idea?" value={customMemeText} onChange={e => setCustomMemeText(e.target.value)} rows={2} />
                                        <div className="flex items-center justify-between gap-4">
                                            <Button onClick={() => fileInputRef.current?.click()} className="flex-1"><FileUp className="mr-2 h-4 w-4"/>Upload Image</Button>
                                            <Input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                            {uploadedImage && (
                                                <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                                                    <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                                                    <Button variant="destructive" size="icon" className="absolute top-0 right-0 h-5 w-5 rounded-full" onClick={() => setUploadedImage(null)}><X className="h-3 w-3" /></Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <Button onClick={handleGenerate} disabled={isLoading} size="lg" className="w-full mt-6 font-bold">
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                    Generate
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Preview and Submit Card */}
                        <Card className="w-full bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl">
                             <CardHeader>
                                <CardTitle className="text-2xl font-bold">2. Preview & Submit</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-4">
                                 <div className="min-h-[250px] bg-muted rounded-lg flex items-center justify-center p-4">
                                     {isLoading && <Loader2 className="h-10 w-10 animate-spin text-primary"/>}
                                     {!isLoading && !isMemeReady && <p className="text-muted-foreground">Your generated meme will appear here</p>}
                                     {isMemeReady && (
                                         <div ref={memeCardRef} className="relative w-full">
                                             <img src={uploadedImage || memeImage!.imageDataUri} alt="Meme background" className="w-full h-auto rounded-md border" />
                                             <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-4">
                                                 <MemeText text={top} />
                                                 <MemeText text={bottom} />
                                             </div>
                                         </div>
                                     )}
                                 </div>
                                 <Button onClick={handleSubmit} disabled={isSubmitting || !isMemeReady || !user} size="lg" className="w-full text-lg rounded-full font-bold">
                                     {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Send className="mr-2 h-5 w-5" />}
                                     Submit for Glory
                                 </Button>
                                 {!user && <p className="text-center text-sm text-yellow-500">You must be <Link href="/auth" className="underline">logged in</Link> to submit.</p>}
                             </CardContent>
                        </Card>
                    </div>

                    {/* Leaderboard */}
                    <Card className="w-full bg-card/80 backdrop-blur-sm shadow-lg border-2 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold flex items-center"><Trophy className="mr-2 text-yellow-500" /> Weekly Leaderboard</CardTitle>
                            <CardDescription>The best jokes as voted by the community.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Rank</TableHead>
                                        <TableHead>Meme</TableHead>
                                        <TableHead className="text-right">Votes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingLeaderboard ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        leaderboard.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-bold text-lg text-center">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <img src={item.imageUrl} alt="Meme" className="w-24 h-24 object-cover rounded-md border" />
                                                        <p className="font-medium">{item.joke}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="font-bold text-primary text-lg">{item.voteCount}</span>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleVote(item.id)}
                                                            disabled={!user || votingStatus[item.id] || (item.voters && item.voters.includes(user.uid))}
                                                        >
                                                            {votingStatus[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : '😂 Vote'}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

    