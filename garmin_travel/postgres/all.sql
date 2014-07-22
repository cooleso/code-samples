CREATE OR REPLACE FUNCTION addr.getLocation(ip TEXT)
  RETURNS TABLE(city_id INT, city_name TEXT, x DOUBLE PRECISION, y DOUBLE PRECISION, region_id INT) AS
  $$
  BEGIN
    RETURN QUERY EXECUTE '
  SELECT
    addr.cities.id,
    addr.cities.name,
    addr.cities.center[0] as x,
    addr.cities.center[1] as y,
    addr.regions.id
  FROM addr.cities
    LEFT JOIN addr.regions ON addr.regions.id = addr.cities.region_id
  WHERE addr.cities.id = (
    SELECT
      CASE WHEN addr.extract_long_from_ip($1) <= end_ip
      THEN city_id
      ELSE NULL END AS id
    FROM addr.ip_blocks
    WHERE start_ip <= addr.extract_long_from_ip($1)
    ORDER BY start_ip DESC
    LIMIT 1)'
    USING $1;
  END;
  $$
LANGUAGE plpgsql;


/*для поиска*/
CREATE AGGREGATE array_accum ( ANYELEMENT )
(
SFUNC = array_append,
STYPE = ANYARRAY,
INITCOND = '{}'
);


/*находит все waypoints с описанием и массивом типов (если есть ссылка на POI) */
DROP FUNCTION get_waypoints_for_route( INT, INT );
CREATE OR REPLACE FUNCTION get_waypoints_for_route(_route_id INT, _user_id INT)
  RETURNS TABLE(
  x DOUBLE PRECISION,
  y DOUBLE PRECISION,
  point_id INTEGER,
  num INTEGER,
  name CHARACTER VARYING,
  wp_point_id INTEGER,
  poi_point_id INTEGER,
  description CHARACTER VARYING,
  poi_groups ltree []) AS
  $$
  BEGIN
    RETURN QUERY
    SELECT
      pt.xy [0]                              AS x,
      pt.xy [1]                              AS y,
      pt.point_id,
      rp.num,
      pt.name,
      waypoint.point_id                      AS wp_point_id,
      rp.poi_point_id,
      poi.description,
      array_agg(poi_poi_groups.poi_group_id) AS poi_groups
    FROM route_point rp
      INNER JOIN point pt
      USING (point_id)
      LEFT JOIN poi ON poi.point_id = rp.poi_point_id
      LEFT JOIN poi_poi_groups ON rp.poi_point_id = poi_poi_groups.point_id
      LEFT JOIN waypoint ON rp.wp_point_id = waypoint.point_id AND waypoint.user_id = _user_id
    WHERE rp.route_id = _route_id
    GROUP BY pt.point_id, rp.num, waypoint.point_id, rp.poi_point_id, poi.description
    ORDER BY rp.num;
  END;
  $$
LANGUAGE plpgsql;

