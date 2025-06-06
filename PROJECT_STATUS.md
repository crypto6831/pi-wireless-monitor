#   P i   W i r e l e s s   M o n i t o r   S t a t u s   -   0 6 / 0 3 / 2 0 2 5 
 
 # #   W o r k i n g   F e a t u r e s : 
 -   C o m p l e t e   d i s t r i b u t e d   m o n i t o r i n g   s y s t e m   o p e r a t i o n a l   o n   A W S   L i g h t s a i l 
 -   R a s p b e r r y   P i   m o n i t o r s   s u c c e s s f u l l y   s e n d i n g   d a t a   t o   A W S   s e r v e r 
 -   D a s h b o a r d   d i s p l a y i n g   r e a l - t i m e   n e t w o r k   d a t a   a n d   m e t r i c s 
 -   M o n g o D B   v a l i d a t i o n   s c h e m a s   f i x e d   f o r   m e t r i c s   a n d   a l e r t s 
 -   C O R S   p r o p e r l y   c o n f i g u r e d   f o r   c r o s s - o r i g i n   A P I   r e q u e s t s 
 -   S e r v i c e   m o n i t o r i n g   w i t h   C U S U M   a n a l y s i s   i m p l e m e n t e d   a n d   w o r k i n g 
 -   W e b S o c k e t   c o n n e c t i o n s   e s t a b l i s h e d   f o r   r e a l - t i m e   u p d a t e s 
 -   D o c k e r   h e a l t h   c h e c k s   f u n c t i o n i n g   p r o p e r l y 
 
 # #   S y s t e m   A r c h i t e c t u r e : 
 -   * * R a s p b e r r y   P i * * :   P y t h o n - b a s e d   m o n i t o r i n g   a g e n t   c o l l e c t i n g   W i F i   m e t r i c s 
 -   * * A W S   S e r v e r * * :   N o d e . j s / E x p r e s s   A P I   w i t h   M o n g o D B / R e d i s   o n   U b u n t u 
 -   * * D a s h b o a r d * * :   R e a c t   f r o n t e n d   a c c e s s i b l e   a t   h t t p : / / 4 7 . 1 2 9 . 2 4 1 . 1 4 7 : 3 0 0 0 
 -   * * A P I * * :   R E S T f u l   e n d p o i n t s   a t   h t t p : / / 4 7 . 1 2 9 . 2 4 1 . 1 4 7 : 3 0 0 1 / a p i 
 
 # #   C u r r e n t   S e r v i c e   M o n i t o r s : 
 -   G o o g l e   ( w w w . g o o g l e . c o m )   -   H T T P S   m o n i t o r i n g 
 -   G o o g l e   D N S   ( 8 . 8 . 8 . 8 )   -   P i n g   m o n i t o r i n g 
 -   B o t h   m o n i t o r s   a c t i v e l y   c o l l e c t i n g   l a t e n c y   d a t a   w i t h   C U S U M   a n a l y s i s 
 
 # #   R e c e n t   F i x e s   ( S e s s i o n   S u m m a r y ) : 
 1 .   * * D o c k e r   H e a l t h   C h e c k s * * :   A d d e d   c u r l   t o   d a s h b o a r d   A l p i n e   i m a g e 
 2 .   * * M o n g o D B   V a l i d a t i o n * * :   U p d a t e d   s c h e m a s   t o   m a t c h   M o n g o o s e   m o d e l s 
       -   R e m o v e d   ' t y p e '   r e q u i r e m e n t   f r o m   m e t r i c s   c o l l e c t i o n 
       -   R e m o v e d   ' t i m e s t a m p '   r e q u i r e m e n t   f r o m   a l e r t s   c o l l e c t i o n 
 3 .   * * C O R S   C o n f i g u r a t i o n * * :   A d d e d   C O R S _ O R I G I N   e n v i r o n m e n t   v a r i a b l e   t o   a l l o w   d a s h b o a r d - A P I   c o m m u n i c a t i o n 
 4 .   * * L o g g i n g * * :   C h a n g e d   l o g g e r . d e b u g   t o   l o g g e r . i n f o   f o r   b e t t e r   v i s i b i l i t y 
 
 # #   K e y   C o n f i g u r a t i o n : 
 -   D a s h b o a r d   U R L :   h t t p : / / 4 7 . 1 2 9 . 2 4 1 . 1 4 7 : 3 0 0 0 
 -   A P I   U R L :   h t t p : / / 4 7 . 1 2 9 . 2 4 1 . 1 4 7 : 3 0 0 1 
 -   M o n g o D B :   R u n n i n g   i n   D o c k e r   w i t h   p r o p e r   v a l i d a t i o n 
 -   R e d i s :   O p e r a t i o n a l   f o r   r e a l - t i m e   u p d a t e s 
 
 # #   N e x t   S e s s i o n   T O D O : 
 -   C o n s i d e r   i m p l e m e n t i n g   h i s t o r i c a l   d a t a   s t o r a g e   f o r   s e r v i c e   m e t r i c s 
 -   A d d   e m a i l / w e b h o o k   a l e r t s   f o r   C U S U M   a n o m a l i e s 
 -   C r e a t e   d a s h b o a r d   w i d g e t   f o r   s e r v i c e   m o n i t o r   s u m m a r y 
 -   A d d   m o r e   s e r v i c e   t y p e s   ( D N S   q u e r y ,   H T T P   s t a t u s   c o d e   c h e c k s ) 
 -   I m p l e m e n t   d a t a   r e t e n t i o n   p o l i c i e s   f o r   l o n g - t e r m   m e t r i c s 
 -   A d d   a u t h e n t i c a t i o n   f o r   d a s h b o a r d   a c c e s s 
 -   S e t   u p   a u t o m a t e d   b a c k u p s   f o r   M o n g o D B   d a t a 
 
 # #   N o t e s : 
 -   S y s t e m   f u l l y   o p e r a t i o n a l   w i t h   a l l   c o m p o n e n t s   c o m m u n i c a t i n g 
 -   P i   m o n i t o r   s e n d i n g   m e t r i c s   e v e r y   6 0   s e c o n d s 
 -   D a s h b o a r d   s h o w i n g   " C o n n e c t e d   w i t h   d a t a "   s t a t u s 
 -   A l l   v a l i d a t i o n   e r r o r s   r e s o l v e d 