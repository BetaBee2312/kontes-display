"use client";



import Link from "next/link";

import {

  useEffect,

  useRef,

  useState,

} from "react";



import { Camera } from "react-feather";

import imageCompression from "browser-image-compression";
import Swal from "sweetalert2";



type Cabang = {

  kode_cabang: string | number;

  nama_cabang: string;

};



type PhotoField = {
  id: number;
  kode_kolom: string;
  nama_kolom: string;
  urutan: number;
  wajib: boolean;
};

type EventOption = {
  id: number | string;
  nama_event: string;
  kode_event: string;
  columns: PhotoField[];
};



export default function FormPage() {

  /*

   * =====================================================

   * STATE CABANG

   * =====================================================

   */

  const [kodeCabang, setKodeCabang] =

    useState("");



  const [cabang, setCabang] =

    useState<Cabang | null>(null);



  const [loadingCabang, setLoadingCabang] =

    useState(false);



  /*

   * =====================================================

   * STATE EVENT

   * =====================================================

   */

  const [events, setEvents] =

    useState<EventOption[]>([]);



  const [selectedEvent, setSelectedEvent] =

    useState<EventOption | null>(null);



  const [eventSearch, setEventSearch] =

    useState("");



  const [eventOpen, setEventOpen] =

    useState(false);



  const [loadingEvent, setLoadingEvent] =

    useState(false);



  const eventRef =

    useRef<HTMLDivElement | null>(null);



  /*

   * =====================================================

   * STATE FORM

   * =====================================================

   */

  const [tanggal, setTanggal] =

    useState("");



  const [fotos, setFotos] = useState<File[]>([]);
  const [selectedFieldCode, setSelectedFieldCode] = useState("");
  const [fieldPhotos, setFieldPhotos] = useState<Record<string, File[]>>({});
  const [fieldPreviews, setFieldPreviews] = useState<Record<string, string[]>>({});



  /*

   * =====================================================

   * STATE SUBMIT

   * =====================================================

   */

  const [compressing, setCompressing] =

    useState(false);



  const [loadingSubmit, setLoadingSubmit] =

    useState(false);



  /*

   * =====================================================

   * MESSAGE

   * =====================================================

   */

  const [message, setMessage] =

    useState("");



  const [error, setError] =

    useState("");

  function showAlert(title: string, text: string, icon: "warning" | "error" = "warning") {
    void Swal.fire({ icon, title, text, confirmButtonText: "Mengerti" });
  }





  /*

   * =====================================================

   * LOAD EVENT MASTER

   *

   * Event baru hanya diambil setelah cabang valid.

   * =====================================================

   */

  useEffect(() => {

    if (!cabang) {

      setEvents([]);

      return;

    }



    async function loadEvents() {

      setLoadingEvent(true);



      try {

        const response =
          await fetch(`/api/event?kode_cabang=${encodeURIComponent(String(cabang.kode_cabang))}`);



        const result =

          await response.json();



        if (!response.ok) {
          if (response.status === 503 || result.code === "NO_EVENTS") {
            showAlert("Cabang Belum Terdaftar", result.message || "Cabang ini belum terdaftar di event manapun.");
            setEvents([]);
            return;
          }
          void Swal.fire({ icon: "error", title: "Gagal memuat event", text: result.message || "Gagal mengambil daftar event." });
          return;
        }



        if (

          result.success &&

          Array.isArray(result.data)

        ) {

          const allowedEvents = result.data as EventOption[];
          setEvents(allowedEvents);
          if (allowedEvents.length === 0) {
            showAlert("Cabang Belum Terdaftar", "Cabang ini belum terdaftar di event manapun. Silakan hubungi administrator untuk mendapatkan akses event.");
          }
        } else {

          setEvents([]);

        }

      } catch (error) {

        console.error(

          "LOAD EVENT ERROR:",

          error

        );



        void Swal.fire({ icon: "error", title: "Gagal memuat event", text: "Gagal mengambil daftar event." });

      } finally {

        setLoadingEvent(false);

      }

    }



    loadEvents();

  }, [cabang]);



  /*

   * =====================================================

   * CLOSE EVENT DROPDOWN WHEN CLICK OUTSIDE

   * =====================================================

   */

  useEffect(() => {

    function handleClickOutside(

      event: MouseEvent

    ) {

      if (

        eventRef.current &&

        !eventRef.current.contains(

          event.target as Node

        )

      ) {

        setEventOpen(false);

      }

    }



    document.addEventListener(

      "mousedown",

      handleClickOutside

    );



    return () => {

      document.removeEventListener(

        "mousedown",

        handleClickOutside

      );

    };

  }, []);



  /*

   * =====================================================

   * RESET FORM SETELAH CABANG DIGANTI

   * =====================================================

   */

  function resetFormSetelahCabang() {

    setSelectedEvent(null);
    setSelectedFieldCode("");
    setFieldPhotos({});
    setFieldPreviews({});
    setEventSearch("");

    setEventOpen(false);



    setTanggal("");



    Object.values(fieldPreviews).flat().forEach((url) => URL.revokeObjectURL(url));
    setFotos([]);
    setFieldPhotos({});
    setFieldPreviews({});



    setEvents([]);



    setError("");

    setMessage("");

  }



  /*

   * =====================================================

   * HANDLE KODE CABANG

   * =====================================================

   */

  function handleKodeCabangChange(

    value: string

  ) {

    setKodeCabang(value);



    /*

     * Kalau user mengubah kode setelah sebelumnya

     * berhasil menemukan cabang, sembunyikan lagi

     * seluruh form lanjutan.

     */

    if (cabang) {

      setCabang(null);

      resetFormSetelahCabang();

    } else {

      setError("");

      setMessage("");

    }

  }



  /*

   * =====================================================

   * CEK CABANG

   * =====================================================

   */

  async function cekCabang() {

    setError("");

    setMessage("");



    /*

     * Sebelum request baru,

     * sembunyikan hasil cabang sebelumnya.

     */

    setCabang(null);

    resetFormSetelahCabang();



    const kode =

      kodeCabang.trim();



    if (!kode) {

      void Swal.fire({ icon: "warning", title: "Masukkan kode cabang", text: "Kode cabang harus diisi terlebih dahulu." });



      return;

    }



    setLoadingCabang(true);



    try {

      const response =

        await fetch(

          `/api/cabang?kode=${encodeURIComponent(

            kode

          )}`

        );



      const result =

        await response.json();



      if (!response.ok) {
        if (response.status === 404 && result.code === "BRANCH_NOT_FOUND") {
          showAlert("Cabang Belum Terdaftar", "Cabang ini belum terdaftar di event manapun. Silakan hubungi administrator untuk mendapatkan akses event.");
        } else {
          void Swal.fire({ icon: "error", title: "Gagal memeriksa cabang", text: result.message || "Gagal memeriksa cabang." });
        }
        return;
      }

      if (!result.success) {
        void Swal.fire({ icon: "error", title: "Gagal memeriksa cabang", text: result.message || "Gagal memeriksa cabang." });
        return;
      }



      if (result.code === "CONFIG_NOT_INSTALLED") {
        showAlert("Konfigurasi Belum Disiapkan", result.message || "Administrator perlu menyiapkan konfigurasi event cabang terlebih dahulu.", "error");
        return;
      }

      if (!Array.isArray(result.data?.events) || result.data.events.length === 0) {
        showAlert("Cabang Belum Terdaftar", "Cabang ini belum terdaftar di event manapun. Silakan hubungi administrator.");
        setCabang(null);
        return;
      }
      setCabang({ kode_cabang: result.data.kode_cabang, nama_cabang: result.data.nama_cabang });
      setEvents(result.data.events as EventOption[]);

    } catch (error) {

      console.error(

        "CEK CABANG ERROR:",

        error

      );



      void Swal.fire({ icon: "error", title: "Server tidak dapat dihubungi", text: "Gagal menghubungi server." });

    } finally {

      setLoadingCabang(false);

    }

  }



  /*

   * =====================================================

   * BUAT EVENT CUSTOM

   *

   * Event custom tidak masuk tb_event.

   * Hanya digunakan pada dokumentasi ini.

   * =====================================================

   */

  /*

   * =====================================================

   * PILIH EVENT

   * =====================================================

   */

  function selectEvent(

    event: EventOption

  ) {

    setSelectedEvent(event);
    setSelectedFieldCode(event.columns?.[0]?.kode_kolom || "");
    setFieldPhotos({});
    setFieldPreviews({});
    setFotos([]);
    setFieldPreviews({});
    setEventSearch("");

    setEventOpen(false);



    setError("");

    setMessage("");

  }



  /*

   * =====================================================

   * KOMPRES + HANDLE FOTO

   * =====================================================

   */

  async function handleFoto(

    e: React.ChangeEvent<HTMLInputElement>

  ) {

    setError("");
    setMessage("");
    if (!selectedFieldCode) {
      void Swal.fire({ icon: "warning", title: "Pilih jenis dokumentasi", text: "Pilih jenis dokumentasi terlebih dahulu." });
      e.target.value = "";
      return;
    }

    const selectedFiles = Array.from(e.target.files ?? []);

    // Reset value so selecting the same file again also triggers onChange.

    e.target.value = "";



    if (selectedFiles.length === 0) {

      return;

    }



    try {

      setCompressing(true);



      const compressedFiles: File[] = [];



      for (const file of selectedFiles) {

        if (!file.type.startsWith("image/")) {

          throw new Error(`"${file.name}" bukan file gambar.`);

        }



        const compressedFile = await imageCompression(file, {

          maxSizeMB: 2,

          maxWidthOrHeight: 1920,

          useWebWorker: true,

          fileType: "image/jpeg",

          initialQuality: 0.85,

        });



        const finalFile = new File(

          [compressedFile],

          `${file.name.replace(/\.[^/.]+$/, "")}.jpg`,

          { type: "image/jpeg", lastModified: Date.now() }

        );



        if (finalFile.size > 2 * 1024 * 1024) {

          throw new Error(

            `Foto "${file.name}" masih lebih dari 2 MB setelah dikompres. Pilih foto lain.`

          );

        }



        console.log("Foto dikompres:", {

          name: finalFile.name,

          originalSizeMB: (file.size / 1024 / 1024).toFixed(2),

          compressedSizeMB: (finalFile.size / 1024 / 1024).toFixed(2),

        });



        compressedFiles.push(finalFile);

      }



      setFieldPhotos((current) => ({ ...current, [selectedFieldCode]: [...(current[selectedFieldCode] || []), ...compressedFiles] }));
      setFieldPreviews((current) => ({ ...current, [selectedFieldCode]: [...(current[selectedFieldCode] || []), ...compressedFiles.map((file) => URL.createObjectURL(file))] }));
      setFotos((current) => [...current, ...compressedFiles]);



      const total = fotos.length + compressedFiles.length;

      void Swal.fire({ icon: "success", title: "Foto siap diupload", text: `${compressedFiles.length} foto siap diupload. Total foto: ${total}. Maksimal 2 MB per foto.`, timer: 1800, showConfirmButton: false });

    } catch (error) {

      console.error("COMPRESSION ERROR:", error);

      void Swal.fire({ icon: "error", title: "Gagal memproses foto", text: error instanceof Error ? error.message : "Gagal mengompres foto." });

    } finally {

      setCompressing(false);

    }

  }



  function removeFieldPhoto(fieldCode: string, index: number) {
    const preview = fieldPreviews[fieldCode]?.[index];
    if (preview) URL.revokeObjectURL(preview);
    setFieldPhotos((current) => ({ ...current, [fieldCode]: (current[fieldCode] || []).filter((_, i) => i !== index) }));
    setFieldPreviews((current) => ({ ...current, [fieldCode]: (current[fieldCode] || []).filter((_, i) => i !== index) }));
    const removedFile = fieldPhotos[fieldCode]?.[index];
    setFotos((current) => current.filter((file) => file !== removedFile));
  }



  /*

   * =====================================================

   * SUBMIT

   * =====================================================

   */

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!cabang) {
      void Swal.fire({ icon: "warning", title: "Cabang belum dipilih", text: "Periksa kode cabang terlebih dahulu." });
      return;
    }
    if (!selectedEvent) {
      void Swal.fire({ icon: "warning", title: "Pilih event", text: "Pilih event yang tersedia untuk cabang ini." });
      return;
    }
    if (!tanggal) {
      void Swal.fire({ icon: "warning", title: "Tanggal wajib diisi", text: "Pilih tanggal dokumentasi terlebih dahulu." });
      return;
    }

    const missingRequired = selectedEvent.columns.find((field) =>
      field.wajib && !(fieldPhotos[field.kode_kolom] || []).length
    );
    if (missingRequired) {
      void Swal.fire({ icon: "warning", title: "Foto wajib diupload", text: `Foto ${missingRequired.nama_kolom} wajib diupload.` });
      return;
    }

    const uploadQueue = selectedEvent.columns.flatMap((field) =>
      (fieldPhotos[field.kode_kolom] || []).map((foto) => ({ foto, field }))
    );
    if (uploadQueue.length === 0) {
      void Swal.fire({ icon: "warning", title: "Belum ada foto", text: "Pilih minimal satu foto pada kolom dokumentasi yang tersedia." });
      return;
    }
    const tooLarge = uploadQueue.find((item) => item.foto.size > 2 * 1024 * 1024);
    if (tooLarge) {
      void Swal.fire({ icon: "warning", title: "Ukuran foto terlalu besar", text: `Foto "${tooLarge.foto.name}" melebihi 2 MB.` });
      return;
    }

    setLoadingSubmit(true);
    try {
      const savedIds: Array<string | number> = [];
      for (let index = 0; index < uploadQueue.length; index++) {
        const { foto, field } = uploadQueue[index];
        const formData = new FormData();
        formData.append("kode_cabang", String(cabang.kode_cabang));
        formData.append("kode_event", selectedEvent.kode_event);
        formData.append("kode_kolom", field.kode_kolom);
        formData.append("tanggal", tanggal);
        formData.append("foto", foto);

        const response = await fetch("/api/dokumentasi", { method: "POST", body: formData });
        const rawText = await response.text();
        let result: any;
        try {
          result = JSON.parse(rawText);
        } catch {
          throw new Error(`Foto ${index + 1}: respons server tidak valid (HTTP ${response.status}). ${savedIds.length} foto sebelumnya berhasil disimpan.`);
        }
        if (!response.ok || !result.success) {
          throw new Error(`Foto ${index + 1}: ${result.message || `Gagal menyimpan (HTTP ${response.status})`}. ${savedIds.length} foto sebelumnya berhasil disimpan.`);
        }
        if (result.data?.id !== undefined) savedIds.push(result.data.id);
      }

      await Swal.fire({ icon: "success", title: "Dokumentasi berhasil disimpan", text: `${uploadQueue.length} foto tersimpan${savedIds.length ? `. ID dokumentasi: ${savedIds.join(", ")}` : ""}.`, confirmButtonText: "Selesai" });
      Object.values(fieldPreviews).flat().forEach((url) => URL.revokeObjectURL(url));
      setFotos([]);
      setFieldPhotos({});
      setFieldPreviews({});
      setTanggal("");
      setSelectedEvent(null);
      setSelectedFieldCode("");
      setEventSearch("");
      setEventOpen(false);
      const cameraInput = document.getElementById("foto-kamera") as HTMLInputElement | null;
      if (cameraInput) cameraInput.value = "";
      const galleryInput = document.getElementById("foto-galeri") as HTMLInputElement | null;
      if (galleryInput) galleryInput.value = "";
    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      await Swal.fire({ icon: "error", title: "Upload gagal", text: error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim data." });
    } finally {
      setLoadingSubmit(false);
    }
  }

  /*

   * =====================================================

   * FILTER EVENT

   * =====================================================

   */

  const filteredEvents = events.filter((event) =>
    event.nama_event.toLowerCase().includes(eventSearch.toLowerCase().trim())
  );

  /*

   * =====================================================

   * KODE CABANG AKTIF

   * =====================================================

   */

  const kodeCabangAktif =

    cabang

      ? String(

          cabang.kode_cabang

        )

      : "";



  /*

   * =====================================================

   * PAGE

   * =====================================================

   */

  return (

    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">

        {/* =================================================

            HEADER

        ================================================= */}

        <div className="mb-8">

          <p className="text-sm font-semibold tracking-wide text-blue-600">

            DOCUMENTATION SYSTEM

          </p>



          <h1 className="mt-2 text-3xl font-bold text-slate-900">

            Upload Dokumentasi

          </h1>



          <p className="mt-2 text-sm leading-6 text-slate-500">

            Masukkan kode cabang terlebih dahulu.

            Setelah cabang ditemukan, formulir

            dokumentasi akan muncul.

          </p>

        </div>



        {/* =================================================

            ERROR

        ================================================= */}

{/* =================================================

            SUCCESS

        ================================================= */}

{/* =================================================

            FORM

        ================================================= */}

        <form

          onSubmit={handleSubmit}

          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"

        >

          {/* =================================================

              KODE SITE

          ================================================= */}

          <div>

            <label

              htmlFor="kodeCabang"

              className="mb-2 block text-sm font-semibold text-slate-700"

            >

              Kode Site

            </label>



            <div className="flex gap-2">

              <input

                id="kodeCabang"

                type="text"

                inputMode="numeric"

                value={kodeCabang}

                onChange={(e) =>

                  handleKodeCabangChange(

                    e.target.value

                  )

                }

                onKeyDown={(e) => {

                  if (

                    e.key ===

                    "Enter"

                  ) {

                    e.preventDefault();

                    cekCabang();

                  }

                }}

                placeholder="Contoh: 23212"

                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"

              />



              <button

                type="button"

                onClick={

                  cekCabang

                }

                disabled={

                  loadingCabang

                }

                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {loadingCabang

                  ? "..."

                  : "Cek"}

              </button>

            </div>

          </div>



          {/* =================================================

              SETELAH CABANG VALID

          ================================================= */}

          {cabang && (

            <>

              {/* =================================================

                  CABANG DITEMUKAN

              ================================================= */}

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">

                      Cabang ditemukan

                    </p>



                    <p className="mt-1 text-lg font-bold text-slate-900">

                      {cabang.nama_cabang}

                    </p>



                    <p className="mt-1 text-sm text-slate-500">

                      Kode Site:{" "}

                      <span className="font-semibold text-slate-700">

                        {

                          kodeCabangAktif

                        }

                      </span>

                    </p>

                  </div>



                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">

                    <svg

                      xmlns="http://www.w3.org/2000/svg"

                      className="h-5 w-5"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke="currentColor"

                      strokeWidth={2}

                    >

                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        d="M5 13l4 4L19 7"

                      />

                    </svg>

                  </div>

                </div>



                <div className="mt-4 border-t border-green-200 pt-4">

                  <Link

                    href={`/${kodeCabangAktif}/riwayat`}

                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"

                  >

                    <svg

                      xmlns="http://www.w3.org/2000/svg"

                      className="h-5 w-5"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke="currentColor"

                      strokeWidth={2}

                    >

                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        d="M12 8v4l3 2"

                      />



                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        d="M21 12a9 9 0 1 1-3.5-7.2"

                      />

                    </svg>



                    Lihat Riwayat Dokumentasi

                  </Link>

                </div>

              </div>



              {/* =================================================

                  EVENT

              ================================================= */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">

                  Acara / Event

                </label>



                <div

                  ref={eventRef}

                  className="relative"

                >

                  <div

                    className={[

                      "flex min-h-[48px] items-center rounded-xl border bg-white transition",

                      eventOpen

                        ? "border-blue-500 ring-4 ring-blue-100"

                        : "border-slate-300",

                    ].join(" ")}

                    onClick={() =>

                      setEventOpen(

                        true

                      )

                    }

                  >

                    <input

                      type="text"

                      value={

                        eventOpen

                          ? eventSearch

                          : selectedEvent

                            ? selectedEvent.nama_event

                            : ""

                      }

                      placeholder={

                        loadingEvent

                          ? "Memuat event..."

                          : "Cari atau pilih acara..."

                      }

                      onFocus={() => {

                        setEventOpen(

                          true

                        );



                        if (

                          selectedEvent

                        ) {

                          setEventSearch(

                            selectedEvent.nama_event

                          );

                        }

                      }}

                      onChange={(e) => {

                        const value =

                          e.target.value;



                        setEventSearch(

                          value

                        );



                        setEventOpen(

                          true

                        );



                        if (

                          selectedEvent

                        ) {

                          setSelectedEvent(

                            null

                          );

                        }



                        setError("");

                        setMessage("");

                      }}

                      onKeyDown={(e) => {

                        if (

                          e.key ===

                          "Escape"

                        ) {

                          setEventOpen(

                            false

                          );

                        }

                      }}

                      className="min-w-0 flex-1 border-none bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"

                    />



                    {selectedEvent &&

                      !eventOpen && (

                        <button

                          type="button"

                          onClick={(e) => {

                            e.stopPropagation();



                            setSelectedEvent(

                              null

                            );



                            setEventSearch(

                              ""

                            );



                            setError(

                              ""

                            );

                          }}

                          className="mr-1 rounded-lg px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-red-500"

                        >

                          ×

                        </button>

                      )}



                    <button

                      type="button"

                      onClick={(e) => {

                        e.stopPropagation();



                        setEventOpen(

                          (current) =>

                            !current

                        );

                      }}

                      disabled={

                        loadingEvent

                      }

                      className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"

                    >

                      <svg

                        xmlns="http://www.w3.org/2000/svg"

                        className={[

                          "h-5 w-5 transition-transform",

                          eventOpen

                            ? "rotate-180 text-blue-600"

                            : "",

                        ].join(

                          " "

                        )}

                        viewBox="0 0 24 24"

                        fill="none"

                        stroke="currentColor"

                        strokeWidth={2}

                      >

                        <path

                          strokeLinecap="round"

                          strokeLinejoin="round"

                          d="M19 9l-7 7-7-7"

                        />

                      </svg>

                    </button>

                  </div>



                  {eventOpen &&

                    !loadingEvent && (

                      <div className="absolute left-0 right-0 top-[54px] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

                        <div className="max-h-72 overflow-y-auto p-1">

                          {filteredEvents.length >

                            0 &&

                            filteredEvents.map(

                              (event) => {

                                const active =

                                  selectedEvent?.id ===

                                  event.id;



                                return (

                                  <button

                                    key={

                                      event.id

                                    }

                                    type="button"

                                    onClick={() =>

                                      selectEvent(

                                        event

                                      )

                                    }

                                    className={[

                                      "flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition",

                                      active

                                        ? "bg-blue-600 text-white"

                                        : "text-slate-800 hover:bg-blue-50 hover:text-blue-700",

                                    ].join(

                                      " "

                                    )}

                                  >

                                    <span className="font-medium">

                                      {

                                        event.nama_event

                                      }

                                    </span>



                                    {active && (

                                      <svg

                                        xmlns="http://www.w3.org/2000/svg"

                                        className="h-4 w-4"

                                        viewBox="0 0 24 24"

                                        fill="none"

                                        stroke="currentColor"

                                        strokeWidth={2}

                                      >

                                        <path

                                          strokeLinecap="round"

                                          strokeLinejoin="round"

                                          d="M5 13l4 4L19 7"

                                        />

                                      </svg>

                                    )}

                                  </button>

                                );

                              }

                            )}



                                                    {filteredEvents.length ===

                            0 && (

                              <div className="px-4 py-8 text-center text-sm text-slate-400">

                                Tidak ada acara.

                              </div>

                            )}

                        </div>

                      </div>

                    )}

                </div>



                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Daftar event dan kolom dokumentasi ditetapkan administrator untuk setiap cabang.
                </p>

              </div>



              {/* =================================================

                  TANGGAL

              ================================================= */}

              <div>

                <label

                  htmlFor="tanggal"

                  className="mb-2 block text-sm font-semibold text-slate-700"

                >

                  Tanggal

                </label>



                <input

                  id="tanggal"

                  type="date"

                  value={tanggal}

                  onChange={(e) =>

                    setTanggal(

                      e.target.value

                    )

                  }

                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"

                />

              </div>



              {/* =================================================

                  FOTO MULTIPLE

              ================================================= */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">

                  Dokumentasi Foto

                </label>
                {selectedEvent?.columns?.length ? (
                  <div className="mb-4 space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Jenis Dokumentasi</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedEvent.columns.map((field) => (
                        <button key={field.kode_kolom} type="button" onClick={() => setSelectedFieldCode(field.kode_kolom)}
                          className={`rounded-xl border p-3 text-left transition ${selectedFieldCode === field.kode_kolom ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                          <span className="block text-sm font-semibold text-slate-800">{field.nama_kolom}{field.wajib ? " *" : ""}</span>
                          <span className="mt-1 block text-xs text-slate-500">{(fieldPhotos[field.kode_kolom] || []).length} foto</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Pilih jenis dokumentasi, lalu ambil foto atau pilih gambar dari galeri. Field hanya muncul jika diaktifkan admin.</p>
                  </div>
                ) : selectedEvent ? (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Event ini belum memiliki kolom foto aktif. Hubungi administrator.</div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <label

                    htmlFor="foto-kamera"

                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-5 text-center transition hover:border-blue-500 hover:bg-blue-100"

                  >

                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">

                      <Camera size={22} strokeWidth={2} />

                    </div>

                    <p className="text-sm font-semibold text-slate-700">

                      Ambil Foto

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      Buka kamera belakang

                    </p>

                    <input

                      id="foto-kamera"

                      type="file"

                      accept="image/*"

                      capture="environment"

                      onChange={handleFoto}

                      disabled={compressing || loadingSubmit}

                      className="hidden"

                    />

                  </label>



                  <label

                    htmlFor="foto-galeri"

                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50"

                  >

                    <p className="text-sm font-semibold text-slate-700">

                      Pilih dari Galeri

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      Bisa pilih beberapa foto

                    </p>

                    <input

                      id="foto-galeri"

                      type="file"

                      accept="image/*"

                      multiple

                      onChange={handleFoto}

                      disabled={compressing || loadingSubmit}

                      className="hidden"

                    />

                  </label>

                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">

                  Kamu bisa mengambil foto satu per satu atau memilih banyak foto dari galeri. Setiap foto dikompres maksimal 2 MB.

                </p>

              </div>



              {/* PREVIEW FOTO */}

              {(fieldPreviews[selectedFieldCode] || []).length > 0 && (

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">

                  <div className="mb-3 flex items-center justify-between gap-3">

                    <p className="text-sm font-semibold text-slate-700">

                      Foto terpilih

                    </p>

                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">

                      {(fieldPhotos[selectedFieldCode] || []).length} foto untuk {selectedEvent?.columns.find((field) => field.kode_kolom === selectedFieldCode)?.nama_kolom || "kolom terpilih"}

                    </span>

                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                    {(fieldPreviews[selectedFieldCode] || []).map((previewUrl, index) => (

                      <div key={`${previewUrl}-${index}`} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">

                        <img

                          src={previewUrl}

                          alt={`Preview dokumentasi ${index + 1}`}

                          className="h-32 w-full object-cover"

                        />

                        <div className="p-2">

                          <p className="truncate text-xs font-medium text-slate-700">

                            {fieldPhotos[selectedFieldCode]?.[index]?.name}

                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">

                            {((fieldPhotos[selectedFieldCode]?.[index]?.size || 0) / 1024 / 1024).toFixed(2)} MB

                          </p>

                          <button

                            type="button"

                            onClick={() => removeFieldPhoto(selectedFieldCode, index)}

                            disabled={loadingSubmit || compressing}

                            className="mt-2 w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"

                          >

                            Hapus foto

                          </button>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              )}



              {/* =================================================

                  SUBMIT

              ================================================= */}

              <button

                type="submit"

                disabled={

                  compressing ||

                  loadingSubmit ||

                  loadingEvent ||

                  !selectedEvent ||

                  !tanggal ||

                  !selectedEvent?.columns.some((field) => (fieldPhotos[field.kode_kolom] || []).length > 0)

                }

                className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {compressing

                  ? "Mengompres..."

                  : loadingSubmit

                    ? "Menyimpan..."

                    : "Simpan Dokumentasi"}

              </button>

            </>

          )}

        </form>

      </div>

    </main>

  );

}