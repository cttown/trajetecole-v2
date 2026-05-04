
-- Réinitialisation complète des trajets et lieux
-- À utiliser uniquement si le site est encore vierge

delete from public.trips;
delete from public.places;

insert into public.places (
  name,
  kind,
  city,
  exact_address,
  postal_code,
  lat,
  lng,
  is_active
)
values
(
  'École Étienne Thieulin - La Faïencerie',
  'school',
  'Bourg-la-Reine',
  '20-22 rue Jean-Roger Thorelle',
  '92340',
  48.783658,
  2.319137,
  true
),
(
  'École République',
  'school',
  'Bourg-la-Reine',
  '18 boulevard Carnot',
  '92340',
  48.778514,
  2.31865,
  true
),
(
  'École Pierre-Loti',
  'school',
  'Bourg-la-Reine',
  '38 rue de Fontenay',
  '92340',
  48.78486,
  2.311522,
  true
),
(
  'École Fontaine-Grelot',
  'school',
  'Bourg-la-Reine',
  '13 rue de la Fontaine Grelot',
  '92340',
  48.77564,
  2.318833,
  true
),
(
  'École maternelle des Bas-Coquarts',
  'school',
  'Bourg-la-Reine',
  '12 rue de la Sarrazine',
  '92340',
  48.78927,
  2.312956,
  true
),
(
  'École Institution privée Notre-Dame',
  'school',
  'Bourg-la-Reine',
  '2 rue de la Bièvre',
  '92340',
  48.780771,
  2.321031,
  true
),
(
  'École Saint-Roch',
  'school',
  'Bourg-la-Reine',
  '17 avenue de Montrouge',
  '92340',
  48.788733,
  2.313412,
  true
),
(
  'Crèche collective municipale Les Rosiers',
  'activity',
  'Bourg-la-Reine',
  '1 bis rue des Rosiers',
  '92340',
  48.782649,
  2.31414,
  true
),
(
  'Crèche familiale Les Rosiers',
  'activity',
  'Bourg-la-Reine',
  '18 rue des Rosiers',
  '92340',
  48.783723,
  2.313874,
  true
),
(
  'Crèche multi-accueil Joffre',
  'activity',
  'Bourg-la-Reine',
  '108 boulevard du Maréchal Joffre',
  '92340',
  48.777546,
  2.313378,
  true
),
(
  'Crèche Leclerc',
  'activity',
  'Bourg-la-Reine',
  '47 avenue du Général Leclerc',
  '92340',
  48.783738,
  2.317238,
  true
),
(
  'Crèche Hoffmann',
  'activity',
  'Bourg-la-Reine',
  '34 rue Hoffmann',
  '92340',
  48.774718,
  2.321863,
  true
),
(
  'Complexe sportif des Bas-Coquarts',
  'activity',
  'Bourg-la-Reine',
  '8 avenue de Montrouge',
  '92340',
  48.785826,
  2.31119,
  true
),
(
  'Gymnase des Bas-Coquarts',
  'activity',
  'Bourg-la-Reine',
  '8 avenue de Montrouge',
  '92340',
  48.785826,
  2.31119,
  true
),
(
  'Halle des Sports',
  'activity',
  'Bourg-la-Reine',
  '8 avenue de Montrouge',
  '92340',
  48.785826,
  2.31119,
  true
),
(
  'Salle d''Armes',
  'activity',
  'Bourg-la-Reine',
  '8 avenue de Montrouge',
  '92340',
  48.785826,
  2.31119,
  true
),
(
  'Stade municipal',
  'activity',
  'Bourg-la-Reine',
  '16 rue Charpentier',
  '92340',
  48.778338,
  2.324249,
  true
),
(
  'Tennis club de Bourg-la-Reine',
  'activity',
  'Bourg-la-Reine',
  '16 rue Charpentier',
  '92340',
  48.778338,
  2.324249,
  true
),
(
  'Conservatoire de Bourg-la-Reine',
  'activity',
  'Bourg-la-Reine',
  '11 boulevard Carnot',
  '92340',
  48.779043,
  2.31725,
  true
),
(
  'Mairie de Bourg-la-Reine',
  'other',
  'Bourg-la-Reine',
  '6 boulevard Carnot',
  '92340',
  48.779057,
  2.315917,
  true
),
(
  'Gare RER B Bourg-la-Reine',
  'other',
  'Bourg-la-Reine',
  'Place de la Gare',
  '92340',
  48.780532,
  2.31292,
  true
),
(
  'Médiathèque de Bourg-la-Reine',
  'other',
  'Bourg-la-Reine',
  '2-4 Rue le Bouvier',
  '92340',
  48.778386,
  2.317069,
  true
);
