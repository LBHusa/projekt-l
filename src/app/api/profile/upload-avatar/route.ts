import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;
// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Ungueltiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei zu gross. Maximum: 2MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = user.id + "/avatar-" + Date.now() + "." + fileExt;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      
      // Check if bucket does not exist
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json(
          { error: "Avatar-Speicher nicht konfiguriert. Bitte kontaktiere den Administrator." },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Fehler beim Hochladen: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Aktualisieren des Profils" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
      message: "Avatar erfolgreich hochgeladen",
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Get current avatar URL
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .single();

    // If there is an existing avatar, try to delete it from storage
    if (profile?.avatar_url && profile.avatar_url.includes("/avatars/")) {
      const pathMatch = profile.avatar_url.match(/avatars\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from("avatars").remove([pathMatch[1]]);
      }
    }

    // Set avatar_url to null
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: null })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Entfernen des Avatars" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Avatar erfolgreich entfernt",
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Parse JSON body
    const body = await request.json();
    const { avatar_seed } = body;

    if (avatar_seed !== null && typeof avatar_seed !== "string") {
      return NextResponse.json(
        { error: "Ungueltiger avatar_seed Wert" },
        { status: 400 }
      );
    }

    // Update user profile with avatar_seed and clear avatar_url when selecting pixel avatar
    const updateData: { avatar_seed: string | null; avatar_url?: null } = {
      avatar_seed,
    };
    
    // If setting a pixel avatar, clear the uploaded image
    if (avatar_seed) {
      updateData.avatar_url = null;
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Aktualisieren des Profils" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_seed,
      message: avatar_seed 
        ? "Pixel-Avatar erfolgreich ausgewaehlt" 
        : "Avatar-Auswahl zurueckgesetzt",
    });
  } catch (error) {
    console.error("Avatar seed update error:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
